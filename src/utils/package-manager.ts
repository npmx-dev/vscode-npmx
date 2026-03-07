import type { PackageManager } from '#types/context'
import type { Extractor } from '#types/extractor'
import type { TextDocument, WorkspaceFolder } from 'vscode'
import { getWorkspaceCatalogExtractorEntry, packageManifestExtractorEntry, workspaceCatalogExtractorEntries } from '#extractors'
import { Uri } from 'vscode'

type DocumentTextReader = (uri: Uri, openDocuments: Map<string, TextDocument>) => Promise<string | undefined>

interface ExtractorRootReader {
  <T>(
    uri: Uri,
    extractor: Extractor<T>,
    openDocuments: Map<string, TextDocument>,
  ): Promise<T | undefined>
}

function normalizeDeclaredPackageManager(value: string | undefined): PackageManager | undefined {
  const packageManagerName = value?.split('@')[0]
  if (packageManagerName === 'npm' || packageManagerName === 'pnpm' || packageManagerName === 'yarn')
    return packageManagerName
}

export async function detectPackageManager(
  folder: WorkspaceFolder,
  openDocuments: Map<string, TextDocument>,
  readDocumentText: DocumentTextReader,
  readExtractorRoot: ExtractorRootReader,
): Promise<PackageManager> {
  const rootPackageUri = Uri.joinPath(folder.uri, packageManifestExtractorEntry.basename)
  const rootPackage = await readExtractorRoot(rootPackageUri, packageManifestExtractorEntry.extractor, openDocuments)
  if (rootPackage) {
    const declaredPackageManager = packageManifestExtractorEntry.extractor.getPackageManifestInfo(rootPackage).packageManager
    const packageManager = normalizeDeclaredPackageManager(declaredPackageManager)
    if (packageManager)
      return packageManager
  }

  for (const entry of workspaceCatalogExtractorEntries) {
    if (await readDocumentText(Uri.joinPath(folder.uri, entry.basename), openDocuments))
      return entry.packageManager
  }

  return 'npm'
}

export async function readWorkspaceCatalogs(
  folder: WorkspaceFolder,
  packageManager: PackageManager,
  openDocuments: Map<string, TextDocument>,
  readExtractorRoot: ExtractorRootReader,
) {
  if (packageManager === 'npm')
    return

  const entry = getWorkspaceCatalogExtractorEntry(packageManager)
  if (!entry)
    return

  const root = await readExtractorRoot(Uri.joinPath(folder.uri, entry.basename), entry.extractor, openDocuments)
  if (!root)
    return

  return entry.extractor.getWorkspaceCatalogInfo(root).catalogs
}
