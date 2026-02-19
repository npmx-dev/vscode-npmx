import { PACKAGE_JSON_BASENAME, PNPM_WORKSPACE_BASENAME } from '#constants'
import { PackageJsonExtractor } from './package-json'
import { PnpmWorkspaceYamlExtractor } from './pnpm-workspace-yaml'

export const extractorEntries = [
  { pattern: `**/${PACKAGE_JSON_BASENAME}`, extractor: new PackageJsonExtractor() },
  { pattern: `**/${PNPM_WORKSPACE_BASENAME}`, extractor: new PnpmWorkspaceYamlExtractor() },
]
