import type { PackageManager } from '#types/context'
import type { Uri } from 'vscode'
import { workspace } from 'vscode'

/** A parsed `package.json` manifest file. */
interface PackageManifest {
  /** Package name. */
  name: string
  /** Package version specifier. */
  version: string
  packageManager?: PackageManager
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
