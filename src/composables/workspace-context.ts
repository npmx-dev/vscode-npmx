import type { Uri } from 'vscode'
import { SUPPORTED_DOCUMENT_PATTERN } from '#constants'
import { deleteWorkspaceContextCache, getWorkspaceContext } from '#core/workspace'
import { logger } from '#state'
import { isSupportedDependencyDocument, isWorkspaceLevelFile } from '#utils/file'
import { useDisposable, useFileSystemWatcher } from 'reactive-vscode'
import { window, workspace } from 'vscode'

export function useWorkspaceContext() {
  useDisposable(workspace.onDidChangeWorkspaceFolders(({ removed }) => {
    removed.forEach((folder) => {
      deleteWorkspaceContextCache(folder)
      logger.info(`[workspace-context] delete workspace folder cache: ${folder.uri.path}`)
    })
  }))

  async function deleteCacheByUri(uri: Uri, reload = true) {
    if (!isSupportedDependencyDocument(uri))
      return

    const ctx = await getWorkspaceContext(uri)
    if (!ctx)
      return

    ctx.loadPackageManifestInfo.delete(uri)
    ctx.loadWorkspaceCatalogInfo.delete(uri)
    logger.info(`[workspace-context] delete dependencies cache: ${uri.path}`)
    if (reload && isWorkspaceLevelFile(uri)) {
      await ctx.loadWorkspace()
    }
  }

  useDisposable(workspace.onDidChangeTextDocument(({ document }) => {
    if (document !== window.activeTextEditor?.document)
      return

    deleteCacheByUri(document.uri, false)
  }))

  const { onDidCreate, onDidChange, onDidDelete } = useFileSystemWatcher(SUPPORTED_DOCUMENT_PATTERN)

  onDidCreate(deleteCacheByUri)
  onDidChange(deleteCacheByUri)
  onDidDelete(deleteCacheByUri)
}
