import type { CodeActionKind, Diagnostic, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-service'
import type { IWorkspaceState } from '../../types'
import type { DiagnosticContext, DiagnosticRule } from './types'
import { displayName } from '#shared/meta'
import { isDependencyFile } from 'npmx-language-core/utils'
import { URI } from 'vscode-uri'
import { getConfig } from '../../config'
import { strategies } from './actions'
import { checkDeprecation } from './rules/deprecation'
import { checkDistTag } from './rules/dist-tag'
import { checkEngineMismatch } from './rules/engine-mismatch'
import { checkReplacement } from './rules/replacement'
import { checkUpgrade } from './rules/upgrade'
import { checkVulnerability } from './rules/vulnerability'

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
  return {
    name: 'npmx-diagnostics',
    capabilities: {
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
      codeActionProvider: {
        codeActionKinds: [
          'quickfix' satisfies typeof CodeActionKind.QuickFix,
        ],
      },
    },
    create(context): LanguageServicePluginInstance {
      return {
        async provideDiagnostics(document, token) {
          const uri = URI.parse(document.uri)
          if (uri.scheme !== 'file' || !isDependencyFile(uri.path))
            return

          const dependencies = await workspaceState.getResolvedDependencies(document.uri)
          if (!dependencies)
            return

          const [
            upgradeEnabled,
            deprecationEnabled,
            distTagEnabled,
            engineMismatchEnabled,
            replacementEnabled,
            vulnerabilityEnabled,
            upgradeIgnoreList,
            deprecationIgnoreList,
            replacementIgnoreList,
            vulnerabilityIgnoreList,
          ] = await Promise.all([
            getConfig(context, 'npmx.diagnostics.upgrade'),
            getConfig(context, 'npmx.diagnostics.deprecation'),
            getConfig(context, 'npmx.diagnostics.distTag'),
            getConfig(context, 'npmx.diagnostics.engineMismatch'),
            getConfig(context, 'npmx.diagnostics.replacement'),
            getConfig(context, 'npmx.diagnostics.vulnerability'),
            getConfig(context, 'npmx.ignore.upgrade'),
            getConfig(context, 'npmx.ignore.deprecation'),
            getConfig(context, 'npmx.ignore.replacement'),
            getConfig(context, 'npmx.ignore.vulnerability'),
          ])

          const diagnostics: Diagnostic[] = []

          const tasks = dependencies.map(async (dep) => {
            if (token.isCancellationRequested)
              return

            const pkg = await dep.packageInfo()
            if (!pkg)
              return

            const ctx: DiagnosticContext = { uri: document.uri, dep, pkg, workspace: workspaceState }

            const rules: ReturnType<DiagnosticRule>[] = []
            if (upgradeEnabled)
              rules.push(checkUpgrade(ctx, upgradeIgnoreList))
            if (deprecationEnabled)
              rules.push(checkDeprecation(ctx, deprecationIgnoreList))
            if (distTagEnabled)
              rules.push(checkDistTag(ctx, []))
            if (engineMismatchEnabled)
              rules.push(checkEngineMismatch(ctx, []))
            if (replacementEnabled)
              rules.push(checkReplacement(ctx, replacementIgnoreList))
            if (vulnerabilityEnabled)
              rules.push(checkVulnerability(ctx, vulnerabilityIgnoreList))

            const results = await Promise.allSettled(rules)
            for (const result of results) {
              if (result.status !== 'fulfilled' || !result.value)
                continue

              const { range: [start, end], ...rest } = result.value

              diagnostics.push({
                source: displayName,
                ...rest,
                range: {
                  start: document.positionAt(start),
                  end: document.positionAt(end),
                },
              })
            }
          })

          await Promise.allSettled(tasks)
          return diagnostics
        },

        provideCodeActions(document, _range, codeActionContext) {
          return codeActionContext.diagnostics.flatMap((diagnostic) => {
            if (diagnostic.source !== displayName)
              return []

            if (!diagnostic.code)
              return []

            const code = String(diagnostic.code)
            const strategy = strategies[code]
            if (!strategy)
              return []

            const groups = strategy.pattern.exec(diagnostic.message)?.groups
            if (!groups)
              return []

            const actionContext = { code, documentUri: document.uri, diagnostic, groups }

            return strategy.actionBuilders.flatMap((build) => build(actionContext))
          })
        },
      }
    },
  }
}
