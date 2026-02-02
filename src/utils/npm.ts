import type { PackageVersionsInfoWithMetadata } from 'fast-npm-meta'
import { logger } from '#state'
import { getVersions } from 'fast-npm-meta'
import { memoize } from './memoize'

/**
 * Encode a package name for use in npm registry URLs.
 * Handles scoped packages (e.g., @scope/name -> @scope%2Fname).
 */
export function encodePackageName(name: string): string {
  if (name.startsWith('@')) {
    return `@${encodeURIComponent(name.slice(1))}`
  }
  return encodeURIComponent(name)
}

export interface PackageInfo extends PackageVersionsInfoWithMetadata {
  versionToTag: Map<string, string>
}

export const getPackageInfo = memoize<string, Promise<PackageInfo>>(async (name) => {
  logger.info(`Fetching package info for ${name}`)

  const pkg = await getVersions(name, {
    metadata: true,
  })
  logger.info(`Fetched package info for ${name}`)

  const versionToTag = new Map<string, string>()
  if (pkg.distTags) {
    for (const [tag, ver] of Object.entries(pkg.distTags)) {
      versionToTag.set(ver, tag)
    }
  }

  return { ...pkg, versionToTag }
})
