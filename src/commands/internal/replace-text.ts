import type { TextEditorCommandCallback } from 'reactive-vscode'
import type { Range, TextEditor, TextEditorEdit } from 'vscode'

export const replaceText: TextEditorCommandCallback = (_: TextEditor, edit: TextEditorEdit, range?: Range, text?: string) => {
  if (!range || !text)
    return

  edit.replace(range, text)
}
