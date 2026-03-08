import type { TextDocument, Uri } from 'vscode'
import { SUPPORTED_DOCUMENT_PATTERN } from '#constants'
import { isSupportedDependencyDocument } from '#extractors'
import { logger } from '#state'
import { deleteWorkspaceContext, getWorkspaceContext } from '#utils/workspace'
import { useActiveTextEditor, useDisposable, useFileSystemWatcher, watchEffect } from 'reactive-vscode'
import { workspace } from 'vscode'

function invalidateByUri(uri: Uri) {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  deleteWorkspaceContext(folder.uri.path)
  logger.info(`[workspace-context] invalidated ${folder.uri.path}`)
}

function warmDocument(document: TextDocument | undefined) {
  if (!document || document.uri.scheme !== 'file' || !isSupportedDependencyDocument(document))
    return

  void getWorkspaceContext(document.uri).catch((error) => {
    logger.warn(`[workspace-context] warm failed for ${document.uri.path}: ${error}`)
  })
}

export function useWorkspaceContext() {
  const activeEditor = useActiveTextEditor()

  watchEffect(() => {
    warmDocument(activeEditor.value?.document)
  })

  useDisposable(workspace.onDidOpenTextDocument((document) => {
    warmDocument(document)
  }))

  useDisposable(workspace.onDidChangeTextDocument(({ document }) => {
    if (!isSupportedDependencyDocument(document))
      return

    invalidateByUri(document.uri)
  }))

  useDisposable(workspace.onDidCloseTextDocument((document) => {
    if (!isSupportedDependencyDocument(document))
      return

    invalidateByUri(document.uri)
  }))

  const { onDidCreate, onDidChange, onDidDelete } = useFileSystemWatcher(SUPPORTED_DOCUMENT_PATTERN)

  onDidCreate(invalidateByUri)
  onDidChange(invalidateByUri)
  onDidDelete(invalidateByUri)
}
