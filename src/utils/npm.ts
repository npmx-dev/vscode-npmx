import type { Packument, PackumentVersion } from '@npm/types'
import { LRUCache } from 'lru-cache'
import { ofetch } from 'ofetch'
import { NPM_REGISTRY } from './constants'

type ResolvedPackumentVersion = Pick<PackumentVersion, 'version'> & { tag?: string }

interface ResolvedPackument {
  versions: Record<string, ResolvedPackumentVersion>
}

/**
 * Encode a package name for use in npm registry URLs.
 * Handles scoped packages (e.g., @scope/name -> @scope%2Fname).
 */
function encodePackageName(name: string): string {
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

    const pkg = await ofetch<Packument>(`${NPM_REGISTRY}/${encodedName}`, { signal })

    const resolvedVersions = Object.fromEntries(
      Object.keys(pkg.versions)
        .filter((v) => pkg.time[v])
        .map<[string, ResolvedPackumentVersion]>((v) => [v, { version: v }]),
    )

    Object.entries(pkg['dist-tags']).forEach(([tag, version]) => {
      resolvedVersions[version].tag = tag
    })

    return {
      versions: resolvedVersions,
    }
  },
})

export async function getPackageInfo(name: string) {
  return (await cache.fetch(name))!
}
