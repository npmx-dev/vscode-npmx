import type { PackageManager } from '#types/context'
import type { WorkspaceFolder } from 'vscode'
import { getWorkspaceCatalogExtractorEntry, packageManifestExtractorEntry, workspaceCatalogExtractorEntries } from '#extractors'
import { readExtractorRoot } from '#utils/document'
import { Uri } from 'vscode'
import { accessOk } from 'vscode-find-up'

function normalizeDeclaredPackageManager(value: string | undefined): PackageManager | undefined {
  const packageManagerName = value?.split('@')[0]
  if (packageManagerName === 'npm' || packageManagerName === 'pnpm' || packageManagerName === 'yarn')
    return packageManagerName
}

export async function detectPackageManager(folder: WorkspaceFolder): Promise<PackageManager> {
  const rootPackageUri = Uri.joinPath(folder.uri, packageManifestExtractorEntry.basename)

  if (await accessOk(rootPackageUri)) {
    const rootPackage = await readExtractorRoot(rootPackageUri, packageManifestExtractorEntry.extractor)
    if (rootPackage) {
      const declaredPackageManager = packageManifestExtractorEntry.extractor.getPackageManifestInfo(rootPackage).packageManager
      const packageManager = normalizeDeclaredPackageManager(declaredPackageManager)
      if (packageManager)
        return packageManager
    }
  }

  for (const entry of workspaceCatalogExtractorEntries) {
    if (await accessOk(Uri.joinPath(folder.uri, entry.basename)))
      return entry.packageManager
  }

  return 'npm'
}

export async function readWorkspaceCatalogs(
  folder: WorkspaceFolder,
  packageManager: PackageManager,
) {
  if (packageManager === 'npm')
    return

  const entry = getWorkspaceCatalogExtractorEntry(packageManager)
  if (!entry)
    return

  const root = await readExtractorRoot(Uri.joinPath(folder.uri, entry.basename), entry.extractor)
  if (!root)
    return

  return entry.extractor.getWorkspaceCatalogInfo(root).catalogs
}
