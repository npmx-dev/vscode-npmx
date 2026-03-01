import type { CodeActionContext, CodeActionProvider, Diagnostic, Range, TextDocument } from 'vscode'
import { CodeAction, CodeActionKind, ConfigurationTarget, WorkspaceEdit } from 'vscode'

interface QuickFixRule {
  pattern: RegExp
  title: (target: string) => string
  isPreferred?: boolean
}

const quickFixRules: Partial<Record<string, QuickFixRule>> = {
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

interface AddIgnoreRule {
  pattern: RegExp
}

const addIgnoreRules: Partial<Record<string, AddIgnoreRule>> = {
  vulnerability: {
    pattern: /^"(?<target>\S+)" has .+ vulnerabilit/,
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

      const actions: CodeAction[] = []

      const quickFixRule = quickFixRules[code]
      const target = quickFixRule?.pattern?.exec(diagnostic.message)?.groups?.target
      if (target) {
        const action = new CodeAction(quickFixRule.title(target), CodeActionKind.QuickFix)
        action.isPreferred = quickFixRule.isPreferred ?? false
        action.diagnostics = [diagnostic]
        action.edit = new WorkspaceEdit()
        action.edit.replace(document.uri, diagnostic.range, target)
        actions.push(action)
      }

      const addIgnoreRule = addIgnoreRules[code]
      const ignoreTarget = addIgnoreRule?.pattern?.exec(diagnostic.message)?.groups?.target
      if (ignoreTarget) {
        for (const [title, configTarget] of [
          [`Ignore ${code} for "${ignoreTarget}" (Workspace)`, ConfigurationTarget.Workspace],
          [`Ignore ${code} for "${ignoreTarget}" (User)`, ConfigurationTarget.Global],
        ] as const) {
          const action = new CodeAction(title, CodeActionKind.QuickFix)
          action.diagnostics = [diagnostic]
          action.command = {
            title,
            command: 'npmx.addToIgnore',
            arguments: [code, ignoreTarget, configTarget],
          }
          actions.push(action)
        }
      }

      return actions
    })
  }
}
