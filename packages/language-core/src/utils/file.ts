import { basename } from 'pathe'
import { PACKAGE_JSON_BASENAME, PNPM_WORKSPACE_BASENAME, YARN_WORKSPACE_BASENAME } from '../constants'

const SUPPORTED_BASENAMES = new Set([
  PACKAGE_JSON_BASENAME,
  PNPM_WORKSPACE_BASENAME,
  YARN_WORKSPACE_BASENAME,
])

export function isDependencyFile(path: string): boolean {
  return SUPPORTED_BASENAMES.has(basename(path))
}

export function isPackageManifest(path: string): path is `${string}/${typeof PACKAGE_JSON_BASENAME}` {
  return path.endsWith(`/${PACKAGE_JSON_BASENAME}`)
}

export function isWorkspaceFile(path: string): path is `${string}/${typeof PNPM_WORKSPACE_BASENAME}` | `${string}/${typeof YARN_WORKSPACE_BASENAME}` {
  return path.endsWith(`/${PNPM_WORKSPACE_BASENAME}`)
    || path.endsWith(`/${YARN_WORKSPACE_BASENAME}`)
}
