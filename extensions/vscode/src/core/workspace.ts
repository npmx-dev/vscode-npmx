import type { DependencyInfo, WorkspaceAdapter } from 'npmx-language-core/workspace'
import type { Uri } from 'vscode'
import { logger } from '#state'
import { isOffsetInRange } from '#utils/ast'
import { getDocumentText } from '#utils/file'
import { isPackageManifest } from 'npmx-language-core/utils'
import { WorkspaceContext } from 'npmx-language-core/workspace'
import { defineCachedFunction } from 'ocache'
import { commands, window, workspace } from 'vscode'
import { accessOk } from 'vscode-find-up'

function createVscodeAdapter(baseUri: Uri): WorkspaceAdapter {
  const toUri = (path: string) => baseUri.with({ path })

  return {
    async readFile(path: string): Promise<string> {
      return getDocumentText(toUri(path))
    },

    async fileExists(path: string): Promise<boolean> {
      return accessOk(toUri(path))
    },

    async detectPackageManager(rootPath: string): Promise<'npm' | 'pnpm' | 'yarn'> {
      try {
        const result = await commands.executeCommand<'npm' | 'pnpm' | 'yarn'>('npm.packageManager', toUri(rootPath))
        return result || 'npm'
      } catch (error) {
        logger.error('Error getting package manager:', error)
        window.showErrorMessage('Failed to detect package manager. Defaulting to npm.')
        return 'npm'
      }
    },
  }
}

export const getWorkspaceContext = defineCachedFunction<
  WorkspaceContext | undefined,
  [Uri]
>(async (uri) => {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  logger.info(`[workspace-context] built ${folder.uri.path}`)
  return await WorkspaceContext.create(folder.uri.path, createVscodeAdapter(folder.uri))
}, {
  name: 'workspace-context',
  getKey: (uri) => workspace.getWorkspaceFolder(uri)?.uri.path ?? '',
  swr: false,
  maxAge: 0,
  staleMaxAge: 0,
})

export async function getResolvedDependencies(uri: Uri): Promise<DependencyInfo[] | undefined> {
  const ctx = await getWorkspaceContext(uri)
  if (!ctx)
    return

  return (
    isPackageManifest(uri.path)
      ? await ctx.loadPackageManifestInfo(uri.path)
      : await ctx.loadWorkspaceFileInfo(uri.path)
  )?.dependencies
}

export async function getResolvedDependencyByOffset(uri: Uri, offset: number): Promise<DependencyInfo | undefined> {
  const dependencies = await getResolvedDependencies(uri)

  return dependencies?.find((dependency) => isOffsetInRange(offset, dependency.nameRange) || isOffsetInRange(offset, dependency.specRange))
}
