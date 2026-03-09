import type { PackageManager } from '#types/context'
import type { WorkspaceFolder } from 'vscode'
import { packageManifestExtractorEntry, workspaceCatalogExtractorEntries } from '#extractors'
import { Uri } from 'vscode'
import { accessOk } from 'vscode-find-up'
import { readPackageManifest } from './file'
import { parsePackageId } from './package'

export async function detectPackageManager(folder: WorkspaceFolder): Promise<PackageManager> {
  const rootPackageUri = Uri.joinPath(folder.uri, packageManifestExtractorEntry.basename)

  if (await accessOk(rootPackageUri)) {
    const rootPackage = await readPackageManifest(rootPackageUri)
    if (rootPackage?.packageManager) {
      const { name: packageManager } = parsePackageId(rootPackage.packageManager)
      if (packageManager)
        return packageManager as PackageManager
    }
  }

  for (const entry of workspaceCatalogExtractorEntries) {
    if (await accessOk(Uri.joinPath(folder.uri, entry.basename)))
      return entry.packageManager
  }

  return 'npm'
}
