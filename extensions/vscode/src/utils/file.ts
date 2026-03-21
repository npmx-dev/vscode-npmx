import type { PackageManifestInfo } from 'npmx-language-core/types'
import type { Uri } from 'vscode'
import { workspace } from 'vscode'

export async function getDocumentText(uri: Uri) {
  const document = await workspace.openTextDocument(uri)
  return document.getText()
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
