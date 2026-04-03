import type { Range as LspRange } from '@volar/vscode'
import { Position, Range, Uri, workspace, WorkspaceEdit } from 'vscode'

export async function replaceText(uri: string, range: LspRange, newText: string) {
  const edit = new WorkspaceEdit()
  edit.replace(
    Uri.parse(uri),
    new Range(
      new Position(range.start.line, range.start.character),
      new Position(range.end.line, range.end.character),
    ),
    newText,
  )
  await workspace.applyEdit(edit)
}
