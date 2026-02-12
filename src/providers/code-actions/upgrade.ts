import type { CodeActionProvider } from 'vscode'
import { UPGRADE_MESSAGE_PREFIX } from '#constants'
import { CodeAction, CodeActionKind, WorkspaceEdit } from 'vscode'

export function createUpgradeProvider(): CodeActionProvider {
  return {
    provideCodeActions(document, _range, context) {
      return context.diagnostics.flatMap((d) => {
        if (!d.message.startsWith(UPGRADE_MESSAGE_PREFIX))
          return []

        const target = d.message.slice(UPGRADE_MESSAGE_PREFIX.length)
        const fix = new CodeAction(`Update to ${target}`, CodeActionKind.QuickFix)
        fix.edit = new WorkspaceEdit()
        fix.edit.replace(document.uri, d.range, `${target}`)
        fix.diagnostics = [d]
        return [fix]
      })
    },
  }
}
