import type { PackageVersionsInfoWithMetadata } from 'fast-npm-meta'
import { logger } from '#state'
import { getVersions } from 'fast-npm-meta'
import { memoize } from '../memoize'

export interface PackageInfo extends PackageVersionsInfoWithMetadata {
  versionToTag: Map<string, string>
}

/**
 * Fetch npm package versions and build a version-to-tag lookup map.
 *
 * @see https://github.com/antfu/fast-npm-meta
 */
export const getPackageInfo = memoize<string, Promise<PackageInfo | null>>(async (name) => {
  logger.info(`Fetching package info for ${name}`)

  const pkg = await getVersions(name, {
    metadata: true,
    throw: false,
    retry: 3,
  })

  if ('error' in pkg) {
    logger.warn(`Fetching package info for ${name} error: ${JSON.stringify(pkg)}`)

    // Return null to trigger a cache hit
    return null
  }

  logger.info(`Fetched package info for ${name}`)

  const versionToTag = new Map<string, string>()
  if (pkg.distTags) {
    for (const [tag, ver] of Object.entries(pkg.distTags)) {
      versionToTag.set(ver, tag)
    }
  }

  return { ...pkg, versionToTag }
})
