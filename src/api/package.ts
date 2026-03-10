import type { MaybeError, PackageVersionsInfoWithMetadata } from 'fast-npm-meta'
import { CACHE_MAX_AGE_ONE_DAY } from '#constants'
import { logger } from '#state'
import { createBatchRunner } from '#utils/batch'
import { getVersionsBatch } from 'fast-npm-meta'
import { defineCachedFunction } from 'ocache'

const BATCH_SIZE = 20

export interface PackageInfo extends PackageVersionsInfoWithMetadata {
  versionToTag: Map<string, string>
}

function parsePackageInfo(name: string, pkg: MaybeError<PackageVersionsInfoWithMetadata>) {
  if ('error' in pkg) {
    logger.warn(`[package] Fetching error(${name}): ${JSON.stringify(pkg)}`)

    // Return null to trigger a cache hit
    if (pkg.status === 404)
      return null

    throw pkg
  }

  const versionToTag = new Map<string, string>()
  if (pkg.distTags) {
    for (const [tag, ver] of Object.entries(pkg.distTags)) {
      versionToTag.set(ver, tag)
    }
  }

  return { ...pkg, versionToTag }
}

const getPackageInfoBatch = createBatchRunner<string, PackageInfo | null>({
  maxSize: BATCH_SIZE,
  runBatch: async (names) => {
    const logName = names.join(', ')
    logger.info(`[package] Fetching ${logName}`)

    const list = await getVersionsBatch(names, {
      metadata: true,
      throw: false,
    })

    logger.info(`[package] Fetched ${logName}`)

    const values = new Map<string, PackageInfo | null>()
    const errors = new Map<string, unknown>()

    names.forEach((name, index) => {
      const item = list[index]
      if (!item) {
        errors.set(name, new Error(`Missing package info response for ${name}`))
        return
      }

      try {
        values.set(name, parsePackageInfo(name, item))
      } catch (error) {
        errors.set(name, error)
      }
    })

    return { values, errors }
  },
})

/**
 * Fetch npm package versions and build a version-to-tag lookup map.
 *
 * @see https://github.com/antfu/fast-npm-meta
 */
export const getPackageInfo = defineCachedFunction<PackageInfo | null, [string]>(async (name) => getPackageInfoBatch(name), {
  name: 'package',
  getKey: (name) => name,
  maxAge: CACHE_MAX_AGE_ONE_DAY,
})
