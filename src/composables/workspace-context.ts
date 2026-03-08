import type { Uri } from 'vscode'
import { SUPPORTED_DOCUMENT_PATTERN } from '#constants'
import { isSupportedDependencyDocument } from '#extractors'
import { logger } from '#state'
import { getWorkspaceContextState } from '#utils/workspace'
import { useActiveTextEditor, useDocumentText, useFileSystemWatcher, watch } from 'reactive-vscode'
import { workspace } from 'vscode'

export function useWorkspaceContext() {
  workspace.onDidChangeWorkspaceFolders(({ removed }) => {
    removed.forEach((folder) => {
      getWorkspaceContextState.delete(folder.uri)
      logger.info(`[workspace-context] delete workspace folder cache: ${folder.uri.path}`)
    })
  })

  async function deleteCacheByUri(uri: Uri) {
    const ctx = await getWorkspaceContextState(uri)
    if (!ctx)
      return

    ctx.loadPackageManifestInfo.delete(uri)
    ctx.loadWorkspaceCatalogInfo.delete(uri)
    logger.info(`[workspace-context] delete cache: ${uri.path}`)
  }

  const activeEditor = useActiveTextEditor()
  const activeDocumentText = useDocumentText(() => activeEditor.value?.document)

  watch(activeDocumentText, async () => {
    const document = activeEditor.value?.document
    if (!document || !isSupportedDependencyDocument(document))
      return

    deleteCacheByUri(document.uri)
  }, { flush: 'pre' })

  const { onDidChange, onDidDelete } = useFileSystemWatcher(SUPPORTED_DOCUMENT_PATTERN)

  onDidChange(deleteCacheByUri)
  onDidDelete(deleteCacheByUri)
}
