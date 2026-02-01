import type { Packument, PackumentVersion } from '@npm/types'
import { logger } from '#state'
import { ofetch } from 'ofetch'
import { memoize } from './memoize'

const NPM_REGISTRY = 'https://registry.npmjs.org'

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

export const getPackageInfo = memoize<string, Promise<ResolvedPackument>>(async (name) => {
  logger.info(`Fetching package info for ${name}`)
  const encodedName = encodePackageName(name)

  const pkg = await ofetch<Packument>(`${NPM_REGISTRY}/${encodedName}`)
  logger.info(`Fetched package info for ${name}`)

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
})
