import type { CodeAction, CodeActionKind, Diagnostic } from '@volar/language-service'
import type { DiagnosticActionData } from './types'
import { ADD_TO_IGNORE_COMMAND } from 'npmx-shared/commands'
import { ConfigurationTarget } from 'npmx-shared/constants'
import { displayName } from 'npmx-shared/meta'

interface CodeActionDiagnosticContext {
  code: string
  data: DiagnosticActionData
  documentUri: string
  diagnostic: Diagnostic
}

type ActionBuilder = (context: CodeActionDiagnosticContext) => CodeAction[]

interface DiagnosticStrategy {
  actionBuilders: ActionBuilder[]
}

const ignoreScopes = [
  { label: 'Workspace', target: ConfigurationTarget.Workspace },
  { label: 'User', target: ConfigurationTarget.Global },
]

function quickFix(
  resolveReplacement: (data: DiagnosticActionData) => string | undefined,
  formatTitle: (replacement: string) => string,
  isPreferred = false,
): ActionBuilder {
  return (context) => {
    const replacement = resolveReplacement(context.data)
    if (!replacement)
      return []

    return [{
      title: formatTitle(replacement),
      kind: 'quickfix' satisfies typeof CodeActionKind.QuickFix,
      diagnostics: [context.diagnostic],
      isPreferred,
      edit: {
        changes: {
          [context.documentUri]: [{
            range: context.diagnostic.range,
            newText: replacement,
          }],
        },
      },
    } satisfies CodeAction]
  }
}

function ignore(resolvePackageId: (data: DiagnosticActionData) => string | undefined): ActionBuilder {
  return (context) => {
    const packageId = resolvePackageId(context.data)
    if (!packageId)
      return []

    return ignoreScopes.map(({ label, target }) => {
      const title = `Ignore ${context.code} for "${packageId}" (${label})`
      return {
        title,
        kind: 'quickfix' satisfies typeof CodeActionKind.QuickFix,
        diagnostics: [context.diagnostic],
        command: {
          title,
          command: ADD_TO_IGNORE_COMMAND,
          arguments: [context.code, packageId, target],
        },
      } satisfies CodeAction
    })
  }
}

function resolveActionData(diagnostic: Diagnostic): DiagnosticActionData | undefined {
  const data: unknown = diagnostic.data
  if (typeof data !== 'object' || data === null)
    return

  return {
    packageId: 'packageId' in data && typeof data.packageId === 'string' ? data.packageId : undefined,
    packageName: 'packageName' in data && typeof data.packageName === 'string' ? data.packageName : undefined,
    targetVersion: 'targetVersion' in data && typeof data.targetVersion === 'string' ? data.targetVersion : undefined,
  }
}

const strategies: Partial<Record<string, DiagnosticStrategy>> = {
  upgrade: {
    actionBuilders: [
      quickFix((data) => data.targetVersion, (replacement) => `Upgrade to ${replacement}`),
      ignore((data) => {
        const { packageName, targetVersion } = data
        if (!packageName || !targetVersion)
          return

        return `${packageName}@${targetVersion}`
      }),
    ],
  },
  vulnerability: {
    actionBuilders: [
      quickFix((data) => data.targetVersion, (replacement) => `Upgrade to ${replacement} to fix vulnerabilities`, true),
      ignore((data) => data.packageId),
    ],
  },
  deprecation: {
    actionBuilders: [
      ignore((data) => data.packageId),
    ],
  },
  replacement: {
    actionBuilders: [
      ignore((data) => data.packageName),
    ],
  },
}

export function createCodeActions(documentUri: string, diagnostics: readonly Diagnostic[]): CodeAction[] {
  return diagnostics.flatMap((diagnostic) => {
    if (diagnostic.source !== displayName || !diagnostic.code)
      return []

    const code = String(diagnostic.code)
    const strategy = strategies[code]
    const data = resolveActionData(diagnostic)
    if (!strategy || !data)
      return []

    const actionContext = { code, data, documentUri, diagnostic }
    return strategy.actionBuilders.flatMap((build) => build(actionContext))
  })
}
