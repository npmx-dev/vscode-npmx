import type { CodeActionContext, CodeActionProvider, Diagnostic, Range, TextDocument, Uri } from 'vscode'
import { CATALOG_DIAGNOSTIC_RELATED_INFO_PREFIX } from '#constants'
import { CodeAction, CodeActionKind, WorkspaceEdit } from 'vscode'

interface QuickFixRule {
  pattern: RegExp
  titleSuffix?: string
  isPreferred?: boolean
}

function createReplaceAction(title: string, diagnostic: Diagnostic, uri: Uri, range: Range, target: string, isPreferred = false): CodeAction {
  const action = new CodeAction(title, CodeActionKind.QuickFix)
  action.isPreferred = isPreferred
  action.diagnostics = [diagnostic]
  action.edit = new WorkspaceEdit()
  action.edit.replace(uri, range, target)
  return action
}

const quickFixRules: Record<string, QuickFixRule> = {
  upgrade: {
    pattern: /^New version available: (?<target>\S+)$/,
  },
  vulnerability: {
    pattern: / Upgrade to (?<target>\S+) to fix\.$/,
    titleSuffix: ' to fix vulnerability',
    isPreferred: true,
  },
}

function getDiagnosticCodeValue(diagnostic: Diagnostic): string | undefined {
  if (typeof diagnostic.code === 'string')
    return diagnostic.code

  if (typeof diagnostic.code === 'object' && typeof diagnostic.code.value === 'string')
    return diagnostic.code.value
}

export class QuickFixProvider implements CodeActionProvider {
  provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContext): CodeAction[] {
    return context.diagnostics.flatMap((diagnostic) => {
      const code = getDiagnosticCodeValue(diagnostic)
      if (!code)
        return []

      const rule = quickFixRules[code]
      if (!rule)
        return []

      const target = rule.pattern.exec(diagnostic.message)?.groups?.target
      if (!target)
        return []

      const {
        titleSuffix = '',
      } = rule

      const relatedCatalog = diagnostic.relatedInformation?.find((i) => i.message.startsWith(CATALOG_DIAGNOSTIC_RELATED_INFO_PREFIX))

      if (relatedCatalog) {
        const openFix = new CodeAction('Open catalog entry in pnpm-workspace.yaml', CodeActionKind.QuickFix)
        openFix.command = {
          title: openFix.title,
          command: 'vscode.open',
          arguments: [relatedCatalog.location.uri, { selection: relatedCatalog.location.range, preview: false }],
        }
        openFix.diagnostics = [diagnostic]

        const updateFix = createReplaceAction(`Update catalog entry to ${target}${titleSuffix}`, diagnostic, relatedCatalog.location.uri, relatedCatalog.location.range, target)

        return [
          openFix,
          updateFix,
        ]
      } else {
        return [createReplaceAction(`Update to ${target}${titleSuffix}`, diagnostic, document.uri, diagnostic.range, target, rule.isPreferred)]
      }
    })
  }
}
