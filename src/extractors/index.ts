import type { TextDocument, Uri } from 'vscode'
import { PACKAGE_JSON_BASENAME, PNPM_WORKSPACE_BASENAME, YARN_WORKSPACE_BASENAME } from '#constants'
import { basename } from 'pathe'
import { PackageJsonExtractor } from './package-json'
import { PnpmWorkspaceYamlExtractor } from './pnpm-workspace-yaml'

export const packageJsonExtractor = new PackageJsonExtractor()
export const workspaceCatalogExtractor = new PnpmWorkspaceYamlExtractor()

export const extractorEntries = [
  { pattern: `**/${PACKAGE_JSON_BASENAME}`, extractor: packageJsonExtractor },
  { pattern: `**/${PNPM_WORKSPACE_BASENAME}`, extractor: workspaceCatalogExtractor },
  { pattern: `**/${YARN_WORKSPACE_BASENAME}`, extractor: workspaceCatalogExtractor },
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
