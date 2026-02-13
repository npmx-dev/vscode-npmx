import type { Range, Uri } from 'vscode'
import { debounce } from 'perfect-debounce'
import { commands, workspace, WorkspaceEdit } from 'vscode'

export const updateVersion = debounce(async (uri?: Uri, range?: Range, newVersion?: string) => {
  if (!uri || !range || !newVersion)
    return

  const edit = new WorkspaceEdit()
  edit.replace(uri, range, newVersion)
  await workspace.applyEdit(edit)
  commands.executeCommand('editor.action.codeLens.refresh')
}, 300, { leading: true, trailing: false })
