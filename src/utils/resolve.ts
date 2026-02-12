import { PACKAGE_JSON_BASENAME } from '#constants'
import { Uri, workspace } from 'vscode'

export function* walkAncestors(start: Uri, shouldStop?: (uri: Uri) => boolean): Generator<Uri, void, void> {
  let current = start
  while (true) {
    yield current

    if (shouldStop?.(current))
      return

    const parent = Uri.joinPath(current, '..')
    if (parent.toString() === current.toString())
      return

    current = parent
  }
}

export async function findNearestFile(filename: string, start: Uri, shouldStop?: (uri: Uri) => boolean): Promise<Uri | undefined> {
  for (const dir of walkAncestors(start, shouldStop)) {
    const fileUri = Uri.joinPath(dir, filename)
    try {
      await workspace.fs.stat(fileUri)
      return fileUri
    } catch {
      continue
    }
  }
}

/** A parsed `package.json` manifest file. */
interface PackageManifest {
  /** Package name. */
  name: string
  /** Package version specifier. */
  version: string
}

/**
 * Resolves the relative path of a file within its package.
 *
 * @param uri The URI of the file to resolve.
 * @returns A promise that resolves to the package manifest and relative path,
 *     or `undefined` if not found.
 */
export async function resolveNearestPackageJson(uri: Uri): Promise<{ manifest: PackageManifest, relativePath: string } | undefined> {
  try {
    const pkgUri = await findNearestFile(PACKAGE_JSON_BASENAME, uri, (u) => u.path.endsWith('/node_modules'))

    if (!pkgUri)
      return

    const content = await workspace.fs.readFile(pkgUri)
    const manifest = JSON.parse(new TextDecoder().decode(content)) as PackageManifest

    if (!manifest || !manifest.name || !manifest.version)
      return

    return {
      manifest,
      relativePath: uri.path.slice(pkgUri.path.lastIndexOf('/') + 1),
    }
  } catch {}
}
