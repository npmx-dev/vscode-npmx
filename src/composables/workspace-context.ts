import type { Uri } from 'vscode'
import { SUPPORTED_DOCUMENT_PATTERN } from '#constants'
import { logger } from '#state'
import { isSupportedDependencyDocument } from '#utils/file'
import { deleteWorkspaceContextCache, getWorkspaceContext } from '#utils/workspace'
import { useDisposable, useFileSystemWatcher } from 'reactive-vscode'
import { window, workspace } from 'vscode'

export function useWorkspaceContext() {
  useDisposable(workspace.onDidChangeWorkspaceFolders(({ removed }) => {
    removed.forEach((folder) => {
      deleteWorkspaceContextCache(folder)
      logger.info(`[workspace-context] delete workspace folder cache: ${folder.uri.path}`)
    })
  }))

  async function deleteCacheByUri(uri: Uri) {
    if (!isSupportedDependencyDocument(uri))
      return

    const ctx = await getWorkspaceContext(uri)
    if (!ctx)
      return

    ctx.loadPackageManifestInfo.delete(uri)
    ctx.loadWorkspaceCatalogInfo.delete(uri)
    logger.info(`[workspace-context] delete dependencies cache: ${uri.path}`)
  }

  useDisposable(workspace.onDidChangeTextDocument(({ document }) => {
    if (document !== window.activeTextEditor?.document)
      return

    deleteCacheByUri(document.uri)
  }))

  const { onDidChange, onDidDelete } = useFileSystemWatcher(SUPPORTED_DOCUMENT_PATTERN)

  onDidChange(deleteCacheByUri)
  onDidDelete(deleteCacheByUri)
}
