import type { CodeActionContext, CodeActionProvider, Diagnostic, Range, TextDocument } from 'vscode'
import { CodeAction, CodeActionKind, WorkspaceEdit } from 'vscode'

interface QuickFixRule {
  pattern: RegExp
  title: (target: string) => string
  isPreferred?: boolean
}

const quickFixRules: Record<string, QuickFixRule> = {
  upgrade: {
    pattern: /^New version available: (?<target>\S+)$/,
    title: (target) => `Update to ${target}`,
  },
  vulnerability: {
    pattern: / Upgrade to (?<target>\S+) to fix\.$/,
    title: (target) => `Update to ${target} to fix vulnerabilities`,
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

      const action = new CodeAction(rule.title(target), CodeActionKind.QuickFix)
      action.isPreferred = rule.isPreferred ?? false
      action.diagnostics = [diagnostic]
      action.edit = new WorkspaceEdit()
      action.edit.replace(document.uri, diagnostic.range, target)
      return [action]
    })
  }
}
