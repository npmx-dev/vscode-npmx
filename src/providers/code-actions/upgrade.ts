import type { CodeActionContext, CodeActionProvider, Command, ProviderResult, Range, Selection, TextDocument } from 'vscode'
import { CATALOG_DIAGNOSTIC_RELATED_INFO_PREFIX, UPGRADE_MESSAGE_PREFIX } from '#constants'
import { CodeAction, CodeActionKind, WorkspaceEdit } from 'vscode'

export class UpgradeProvider implements CodeActionProvider {
  provideCodeActions(document: TextDocument, _range: Range | Selection, context: CodeActionContext): ProviderResult<(CodeAction | Command)[]> {
    return context.diagnostics.flatMap((d) => {
      if (!d.message.startsWith(UPGRADE_MESSAGE_PREFIX))
        return []

      const target = d.message.slice(UPGRADE_MESSAGE_PREFIX.length)
      const related = d.relatedInformation?.find((i) => i.message.startsWith(CATALOG_DIAGNOSTIC_RELATED_INFO_PREFIX))
      if (related) {
        const openFix = new CodeAction('Open catalog entry in pnpm-workspace.yaml', CodeActionKind.QuickFix)
        openFix.command = {
          title: openFix.title,
          command: 'vscode.open',
          arguments: [related.location.uri, { selection: related.location.range, preview: false }],
        }
        openFix.diagnostics = [d]

        const updateFix = new CodeAction(`Update catalog entry to ${target}`, CodeActionKind.QuickFix)
        updateFix.edit = new WorkspaceEdit()
        updateFix.edit.replace(related.location.uri, related.location.range, `${target}`)
        updateFix.command = {
          title: updateFix.title,
          command: 'vscode.open',
          arguments: [related.location.uri, { selection: related.location.range, preview: false }],
        }
        updateFix.diagnostics = [d]

        return [openFix, updateFix]
      }

      const fix = new CodeAction(`Update to ${target}`, CodeActionKind.QuickFix)
      fix.edit = new WorkspaceEdit()
      fix.edit.replace(document.uri, d.range, `${target}`)
      fix.diagnostics = [d]
      return [fix]
    })
  }
}
