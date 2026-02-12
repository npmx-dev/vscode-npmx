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
 * Reads and parses a `package.json` file.
 *
 * @param pkgJsonUri The URI of the `package.json` file.
 * @returns A promise that resolves to the parsed manifest,
 *     or `undefined` if the file is invalid or missing required fields.
 */
export async function resolvePackageJson(pkgJsonUri: Uri): Promise<PackageManifest | undefined> {
  try {
    const content = await workspace.fs.readFile(pkgJsonUri)
    const manifest = JSON.parse(new TextDecoder().decode(content)) as PackageManifest

    if (!manifest || !manifest.name || !manifest.version)
      return

    return manifest
  } catch {}
}
