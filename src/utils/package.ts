import type { PackageInfo } from './api/package'
import maxSatisfying from 'semver/ranges/max-satisfying'

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

export function formatPackageId(name: string, version: string): string {
  return `${name}@${version}`
}

interface ParsedPackageId {
  name: string
  version: string | null
}

export function parsePackageId(id: string): ParsedPackageId {
  const separatorIndex = id.lastIndexOf('@')
  if (separatorIndex <= 0) {
    return {
      name: id,
      version: null,
    }
  }

  return {
    name: id.slice(0, separatorIndex),
    version: id.slice(separatorIndex + 1),
  }
}

export function resolveExactVersion(pkg: PackageInfo, version: string) {
  if (Object.hasOwn(pkg.distTags, version))
    return pkg.distTags[version]

  return maxSatisfying(Object.keys(pkg.versionsMeta), version)
}
