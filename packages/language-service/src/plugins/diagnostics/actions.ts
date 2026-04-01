import type { CodeAction, CodeActionKind, Diagnostic } from '@volar/language-service'
import { ADD_TO_IGNORE_COMMAND } from 'npmx-shared/commands'
import { ConfigurationTarget } from 'npmx-shared/constants'

type MatchGroups = NonNullable<RegExpExecArray['groups']>

interface CodeActionDiagnosticContext {
  code: string
  documentUri: string
  diagnostic: Diagnostic
  groups: MatchGroups
}

type ActionBuilder = (context: CodeActionDiagnosticContext) => CodeAction[]

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

function ignore(resolvePackageId: (groups: MatchGroups) => string | undefined): ActionBuilder {
  return (context) => {
    const packageId = resolvePackageId(context.groups)
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

export const strategies: Partial<Record<string, DiagnosticStrategy>> = {
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
