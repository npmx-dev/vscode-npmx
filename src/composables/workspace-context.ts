import type { TextDocument, Uri } from 'vscode'
import { extractorEntries, isSupportedDependencyDocument } from '#extractors'
import { logger } from '#state'
import { getWorkspaceContext, invalidateWorkspaceContext } from '#utils/workspace'
import { useActiveTextEditor, useDisposable, useFileSystemWatcher, watch } from 'reactive-vscode'
import { workspace } from 'vscode'

function invalidateByUri(uri: Uri) {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  invalidateWorkspaceContext(folder.uri.path)
}

function warmDocument(document: TextDocument | undefined) {
  if (!document || document.uri.scheme !== 'file' || !isSupportedDependencyDocument(document))
    return

  void getWorkspaceContext(document.uri).catch((error) => {
    logger.warn(`[workspace-context] warm failed for ${document.uri.path}: ${error}`)
  })
}

export function useWorkspaceContextLifecycle() {
  const activeEditor = useActiveTextEditor()

  watch(() => activeEditor.value?.document, (document) => {
    warmDocument(document)
  }, { immediate: true })

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

  extractorEntries.forEach(({ pattern }) => {
    const { onDidCreate, onDidChange, onDidDelete } = useFileSystemWatcher(pattern)

    onDidCreate(invalidateByUri)
    onDidChange(invalidateByUri)
    onDidDelete(invalidateByUri)
  })
}
