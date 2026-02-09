import type { CodeActionContext, CodeActionProvider, Command, ProviderResult, Range, Selection, TextDocument } from 'vscode'
import { CodeAction, CodeActionKind, WorkspaceEdit } from 'vscode'

const UPGRADE_MESSAGE_RE = /^New version available: (.+)$/

export class UpgradeProvider implements CodeActionProvider {
  provideCodeActions(document: TextDocument, _range: Range | Selection, context: CodeActionContext): ProviderResult<(CodeAction | Command)[]> {
    return context.diagnostics.flatMap((d) => {
      const match = d.message.match(UPGRADE_MESSAGE_RE)
      if (!match)
        return []

      const target = match[1]
      const fix = new CodeAction(`Update to ${target}`, CodeActionKind.QuickFix)
      fix.edit = new WorkspaceEdit()
      fix.edit.replace(document.uri, d.range, `"${target}"`)
      fix.diagnostics = [d]
      return [fix]
    })
  }
}
