import type { PackageManager } from '#types/context'
import type { Extractor, PackageManifestExtractor, WorkspaceCatalogExtractor } from '#types/extractor'
import type { TextDocument, Uri } from 'vscode'
import { PACKAGE_JSON_BASENAME, PNPM_WORKSPACE_BASENAME, YARN_WORKSPACE_BASENAME } from '#constants'
import { basename } from 'pathe'
import { PackageJsonDocumentExtractor } from './package-json'
import { WorkspaceCatalogDocumentExtractor } from './workspace-catalog'

interface BaseExtractorEntry<TExtractor extends Extractor = Extractor> {
  basename: string
  pattern: string
  extractor: TExtractor
}

interface PackageManifestExtractorEntry extends BaseExtractorEntry<PackageManifestExtractor> {}

interface WorkspaceCatalogExtractorEntry extends BaseExtractorEntry<WorkspaceCatalogExtractor> {
  packageManager: Exclude<PackageManager, 'npm'>
}

type DependencyExtractorEntry = PackageManifestExtractorEntry | WorkspaceCatalogExtractorEntry

const packageJsonExtractor = new PackageJsonDocumentExtractor()
const workspaceCatalogExtractor = new WorkspaceCatalogDocumentExtractor()

export const packageManifestExtractorEntry: PackageManifestExtractorEntry = {
  basename: PACKAGE_JSON_BASENAME,
  pattern: `**/${PACKAGE_JSON_BASENAME}`,
  extractor: packageJsonExtractor,
}

export const workspaceCatalogExtractorEntries: WorkspaceCatalogExtractorEntry[] = [
  {
    basename: PNPM_WORKSPACE_BASENAME,
    pattern: `**/${PNPM_WORKSPACE_BASENAME}`,
    extractor: workspaceCatalogExtractor,
    packageManager: 'pnpm',
  },
  {
    basename: YARN_WORKSPACE_BASENAME,
    pattern: `**/${YARN_WORKSPACE_BASENAME}`,
    extractor: workspaceCatalogExtractor,
    packageManager: 'yarn',
  },
]

export const extractorEntries: DependencyExtractorEntry[] = [
  packageManifestExtractorEntry,
  ...workspaceCatalogExtractorEntries,
]

const SUPPORTED_BASENAMES = new Set([
  PACKAGE_JSON_BASENAME,
  PNPM_WORKSPACE_BASENAME,
  YARN_WORKSPACE_BASENAME,
])

export function isSupportedDependencyDocument(documentOrUri: TextDocument | Uri): boolean {
  const path = 'uri' in documentOrUri ? documentOrUri.uri.path : documentOrUri.path
  return SUPPORTED_BASENAMES.has(basename(path))
}
