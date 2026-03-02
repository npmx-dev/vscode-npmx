import { PNPM_WORKSPACE_BASENAME, YARN_WORKSPACE_BASENAME } from '#constants'
import { memoize } from '#utils/memoize'
import { parseYaml } from '#utils/parse'
import { findNearestFile } from '#utils/resolve'
import { Uri, workspace } from 'vscode'
import { extractYamlCatalogs } from './catalog/yaml'

export type WorkspaceCatalogs = Map<string, Map<string, string>>

function createWorkspaceFolderStop(): (uri: Uri) => boolean {
  const roots = new Set(workspace.workspaceFolders?.map((f) => f.uri.toString()) ?? [])
  return (uri) => roots.has(uri.toString())
}

const findWorkspaceUri = memoize(
  async (fileUri: Uri) =>
    await findNearestFile([PNPM_WORKSPACE_BASENAME, YARN_WORKSPACE_BASENAME], Uri.joinPath(fileUri, '..'), createWorkspaceFolderStop()) ?? null,
  { getKey: (uri) => Uri.joinPath(uri, '..').toString() },
)

async function getCatalogs(fileUri: Uri) {
  const workspaceUri = await findWorkspaceUri(fileUri)
  if (!workspaceUri)
    return

  const doc = await workspace.openTextDocument(workspaceUri)
  const root = parseYaml(doc)
  if (!root)
    return

  return extractYamlCatalogs(root)
}

export async function resolveCatalogVersion(fileUri: Uri, packageName: string, catalogName: string): Promise<string | undefined> {
  const catalogs = await getCatalogs(fileUri)
  if (!catalogs)
    return

  return catalogs.get(catalogName || 'default')?.get(packageName)
}
