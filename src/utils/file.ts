import type { PackageManifestInfo } from '#types/extractor'
import type { TextDocument, Uri } from 'vscode'
import { PACKAGE_JSON_BASENAME, PNPM_WORKSPACE_BASENAME, YARN_WORKSPACE_BASENAME } from '#shared/constants'
import { basename } from 'pathe'
import { workspace } from 'vscode'

export async function getDocumentText(uri: Uri) {
  const document = await workspace.openTextDocument(uri)
  return document.getText()
}

const SUPPORTED_BASENAMES = new Set([
  PACKAGE_JSON_BASENAME,
  PNPM_WORKSPACE_BASENAME,
  YARN_WORKSPACE_BASENAME,
])

export function isSupportedDependencyDocument(documentOrUri: TextDocument | Uri): boolean {
  const path = 'uri' in documentOrUri ? documentOrUri.uri.path : documentOrUri.path
  return SUPPORTED_BASENAMES.has(basename(path))
}

export function isPackageManifestPath(path: string): path is `${string}/${typeof PACKAGE_JSON_BASENAME}` {
  return path.endsWith(`/${PACKAGE_JSON_BASENAME}`)
}

export function isWorkspaceFilePath(path: string): path is `${string}/${typeof PNPM_WORKSPACE_BASENAME}` | `${string}/${typeof YARN_WORKSPACE_BASENAME}` {
  return path.endsWith(`/${PNPM_WORKSPACE_BASENAME}`)
    || path.endsWith(`/${YARN_WORKSPACE_BASENAME}`)
}

export function isRootPackageJson(uri: Uri): boolean {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return false

  return uri.path === `${folder.uri.path}/${PACKAGE_JSON_BASENAME}`
}

export function isWorkspaceLevelFile(uri: Uri): boolean {
  return isWorkspaceFilePath(uri.path) || isRootPackageJson(uri)
}

/**
 * Reads and parses a `package.json` file.
 *
 * @param pkgJsonUri The URI of the `package.json` file.
 * @returns A promise that resolves to the parsed manifest,
 *     or `undefined` if the file is invalid or missing required fields.
 */
export async function readPackageManifest(pkgJsonUri: Uri): Promise<PackageManifestInfo | undefined> {
  try {
    const content = await workspace.fs.readFile(pkgJsonUri)
    const manifest = JSON.parse(new TextDecoder().decode(content)) as PackageManifestInfo

    if (!manifest || !manifest.name || !manifest.version)
      return

    return manifest
  } catch {}
}
