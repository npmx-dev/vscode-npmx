import type { Packument, PackumentVersion } from '@npm/types'
import { NPM_REGISTRY } from '#constants'
import { logger } from '#state'
import { LRUCache } from 'lru-cache'
import { ofetch } from 'ofetch'

interface ResolvedPackumentVersion extends Pick<PackumentVersion, 'version'> {
  tag?: string
  hasProvenance: boolean
  deprecated?: string
}

export interface ResolvedPackument {
  versions: Record<string, ResolvedPackumentVersion>
}

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

const cache = new LRUCache<string, ResolvedPackument>({
  max: 500,
  ttl: 5 * 60 * 1000,
  updateAgeOnGet: true,
  allowStale: true,
  fetchMethod: async (name, staleValue, { signal }) => {
    const encodedName = encodePackageName(name)

    try {
      logger.info(`[${name}] fetching package info...`)
      const pkg = await ofetch<Packument>(`${NPM_REGISTRY}/${encodedName}`, { signal })
      logger.info(`[${name}] fetching package info done!`)

      const resolvedVersions = Object.fromEntries(
        Object.keys(pkg.versions)
          .filter((v) => pkg.time[v])
          .map<[string, ResolvedPackumentVersion]>((v) => [
            v,
            {
              version: v,
              // @ts-expect-error present if published with provenance
              hasProvenance: !!pkg.versions[v].dist.attestations,
              deprecated: pkg.versions[v].deprecated,
            },
          ]),
      )

      Object.entries(pkg['dist-tags']).forEach(([tag, version]) => {
        resolvedVersions[version].tag = tag
      })

      return {
        versions: resolvedVersions,
      }
    } catch (err) {
      logger.warn(`[${name}] fetching package info error: `, err)
    }
  },
})

export async function getPackageInfo(name: string) {
  return (await cache.fetch(name))!
}
