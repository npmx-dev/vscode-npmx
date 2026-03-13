import type { DiagnosticsCode } from '#shared/types'
import type { CodeActionContext, CodeActionProvider, Diagnostic, Range, TextDocument } from 'vscode'
import { internalCommands } from '#state'
import { CodeAction, CodeActionKind, ConfigurationTarget, WorkspaceEdit } from 'vscode'

type MatchGroups = NonNullable<RegExpExecArray['groups']>

interface DiagnosticContext {
  code: DiagnosticsCode
  document: TextDocument
  diagnostic: Diagnostic
  groups: MatchGroups
}

type ActionBuilder = (context: DiagnosticContext) => CodeAction[]

interface DiagnosticStrategy {
  pattern: RegExp
  actionBuilders: ActionBuilder[]
}

const ignoreScopes = [
  { label: 'Workspace', target: ConfigurationTarget.Workspace },
  { label: 'User', target: ConfigurationTarget.Global },
]

function quickFix(
  resolveReplacement: (groups: MatchGroups) => string | undefined,
  formatTitle: (replacement: string) => string,
  isPreferred = false,
): ActionBuilder {
  return (context) => {
    const replacement = resolveReplacement(context.groups)
    if (!replacement)
      return []

    const action = new CodeAction(formatTitle(replacement), CodeActionKind.QuickFix)
    action.diagnostics = [context.diagnostic]
    action.isPreferred = isPreferred
    action.edit = new WorkspaceEdit()
    action.edit.replace(context.document.uri, context.diagnostic.range, replacement)

    return [action]
  }
}

function ignore(resolvePackageId: (groups: MatchGroups) => string | undefined): ActionBuilder {
  return (context) => {
    const packageId = resolvePackageId(context.groups)
    if (!packageId)
      return []

    return ignoreScopes.map(({ label, target }) => {
      const title = `Ignore ${context.code} for "${packageId}" (${label})`
      const action = new CodeAction(title, CodeActionKind.QuickFix)
      action.diagnostics = [context.diagnostic]
      action.command = {
        title,
        command: internalCommands.addToIgnore,
        arguments: [context.code, packageId, target],
      }

      return action
    })
  }
}

const strategies: Partial<Record<DiagnosticsCode, DiagnosticStrategy>> = {
  upgrade: {
    pattern: /^"(?<packageName>\S+)" can be upgraded to (?<targetVersion>[^"\s]+)\.$/,
    actionBuilders: [
      quickFix((g) => g.targetVersion, (replacement) => `Upgrade to ${replacement}`),
      ignore((g) => {
        const targetVersion = g.targetVersion
        if (!targetVersion)
          return

        return `${g.packageName}@${targetVersion}`
      }),
    ],
  },
  vulnerability: {
    pattern: /^"(?<packageId>\S+)" has .+ vulnerabilit(?:y|ies)\.(?: Upgrade to (?<targetVersion>\S+) to fix\.)?$/,
    actionBuilders: [
      quickFix((g) => g.targetVersion, (replacement) => `Upgrade to ${replacement} to fix vulnerabilities`, true),
      ignore((g) => g.packageId),
    ],
  },
  deprecation: {
    pattern: /^"(?<packageId>\S+)" has been deprecated/,
    actionBuilders: [
      ignore((g) => g.packageId),
    ],
  },
  replacement: {
    pattern: /^"(?<packageName>\S+)"/,
    actionBuilders: [
      ignore((g) => g.packageName),
    ],
  },
}

function getDiagnosticCodeValue(diagnostic: Diagnostic): DiagnosticsCode | undefined {
  if (typeof diagnostic.code === 'string')
    return diagnostic.code as DiagnosticsCode

  if (typeof diagnostic.code === 'object' && typeof diagnostic.code.value === 'string')
    return diagnostic.code.value as DiagnosticsCode
}

export class QuickFixProvider implements CodeActionProvider {
  provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContext): CodeAction[] {
    return context.diagnostics.flatMap((diagnostic) => {
      const code = getDiagnosticCodeValue(diagnostic)
      if (!code)
        return []

      const strategy = strategies[code]
      if (!strategy)
        return []

      const groups = strategy.pattern.exec(diagnostic.message)?.groups
      if (!groups)
        return []

      const diagnosticContext: DiagnosticContext = { code, document, diagnostic, groups }

      return strategy.actionBuilders.flatMap((build) => build(diagnosticContext))
    })
  }
}
