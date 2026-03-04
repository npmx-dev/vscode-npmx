import type { DiagnosticsCode } from '#types/meta'
import type { CodeActionContext, CodeActionProvider, Diagnostic, Range, TextDocument } from 'vscode'
import { internalCommands } from '#state'
import { parsePackageId } from '#utils/package'
import { CodeAction, CodeActionKind, ConfigurationTarget, WorkspaceEdit } from 'vscode'

interface QuickFixRule {
  pattern: RegExp
  title: (target: string) => string
  isPreferred?: boolean
}

const quickFixRules: Partial<Record<DiagnosticsCode, QuickFixRule>> = {
  upgrade: {
    pattern: /^"\S+" can be upgraded to (?<target>\S+)\.$/,
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
  getTarget?: (groups: Record<string, string>) => string
}

const addIgnoreRules: Partial<Record<DiagnosticsCode, AddIgnoreRule>> = {
  upgrade: {
    pattern: /^"(?<current>[^"]+)" can be upgraded to (?<targetVersion>[^"\s]+)\.$/,
    getTarget: (groups) => {
      const parsed = parsePackageId(groups.current)
      return `${parsed.name}@${groups.targetVersion}`
    },
  },
  deprecation: {
    pattern: /^"(?<target>\S+)" has been deprecated/,
  },
  replacement: {
    pattern: /^"(?<target>\S+)"/,
  },
  vulnerability: {
    pattern: /^"(?<target>\S+)" has .+ vulnerabilit/,
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
      if (addIgnoreRule) {
        const {
          pattern,
          getTarget = (groups) => groups.target,
        } = addIgnoreRule

        const addIgnoreMatch = pattern.exec(diagnostic.message)
        const ignoreTarget = addIgnoreMatch?.groups && getTarget(addIgnoreMatch.groups)

        if (ignoreTarget) {
          for (const [title, configTarget] of [
            [`Ignore ${code} for "${ignoreTarget}" (Workspace)`, ConfigurationTarget.Workspace],
            [`Ignore ${code} for "${ignoreTarget}" (User)`, ConfigurationTarget.Global],
          ] as const) {
            const action = new CodeAction(title, CodeActionKind.QuickFix)
            action.diagnostics = [diagnostic]
            action.command = {
              title,
              command: internalCommands.addToIgnore,
              arguments: [code, ignoreTarget, configTarget],
            }
            actions.push(action)
          }
        }
      }

      return actions
    })
  }
}
