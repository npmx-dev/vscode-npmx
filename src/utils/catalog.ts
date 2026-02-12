import type { Catalogs } from '@pnpm/catalogs.types'
import type { WorkspaceManifest } from '@pnpm/workspace.read-manifest'
import type { Uri } from 'vscode'
import { getCatalogsFromWorkspaceManifest } from '@pnpm/catalogs.config'
import { WORKSPACE_MANIFEST_FILENAME } from '@pnpm/constants'
import { workspace } from 'vscode'
import { parse } from 'yaml'
import { memoize } from './memoize'
import { findNearestFile } from './resolve'

const readAndParseCatalog = memoize(
  async ({ uri }: { uri: Uri, mtime: number }) => {
    const content = new TextDecoder().decode(await workspace.fs.readFile(uri))
    const root = parse(content) as WorkspaceManifest

    return getCatalogsFromWorkspaceManifest(root)
  },
  {
    getKey: ({ uri, mtime }) => `${uri}:${mtime}`,
    maxSize: 1,
  },
)

export async function resolvePnpmCatalogs(documentUri: Uri): Promise<Catalogs | undefined> {
  const workspaceUri = await findNearestFile(WORKSPACE_MANIFEST_FILENAME, documentUri)
  if (!workspaceUri)
    return

  const stat = await workspace.fs.stat(workspaceUri)
  return readAndParseCatalog({ uri: workspaceUri, mtime: stat.mtime })
}
