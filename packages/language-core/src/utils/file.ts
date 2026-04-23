import { basename } from 'path-browserify'
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
