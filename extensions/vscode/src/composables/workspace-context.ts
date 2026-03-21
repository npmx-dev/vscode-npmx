import type { Uri } from 'vscode'
import { deleteWorkspaceContextCache, getWorkspaceContext } from '#core/workspace'
import { logger } from '#state'
import { SUPPORTED_DOCUMENT_PATTERN } from '#utils/constants'
import { PACKAGE_JSON_BASENAME } from 'npmx-language-core/constants'
import { isDependencyFile, isWorkspaceFile } from 'npmx-language-core/utils'
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
    if (!isDependencyFile(uri.path))
      return

    const ctx = await getWorkspaceContext(uri)
    if (!ctx)
      return

    ctx.invalidateDependencyInfo(uri)
    logger.info(`[workspace-context] invalidate dependencies cache: ${uri.path}`)
    if (reload) {
      const folderPath = ctx!.folder.uri.path
      const isRoot = uri.path === `${folderPath}/${PACKAGE_JSON_BASENAME}`
      if (isRoot || isWorkspaceFile(uri.path))
        await ctx.loadWorkspace()
    }
  }

  useDisposable(workspace.onDidChangeTextDocument(({ document }) => {
    const activeEditor = window.activeTextEditor
    if (
      !activeEditor
      || document !== activeEditor.document
      || document.version === activeEditor.document.version
    ) {
      return
    }

    deleteCacheByUri(document.uri, false)
  }))

  const { onDidCreate, onDidChange, onDidDelete } = useFileSystemWatcher(SUPPORTED_DOCUMENT_PATTERN)

  onDidCreate(deleteCacheByUri)
  onDidChange(deleteCacheByUri)
  onDidDelete(deleteCacheByUri)
}
