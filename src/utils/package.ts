import type { PackageInfo } from './api/package'
import Range from 'semver/classes/range'
import gt from 'semver/functions/gt'
import lte from 'semver/functions/lte'
import satisfies from 'semver/functions/satisfies'

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

const JSR_NPM_SCOPE = '@jsr/'

export function isJsrNpmPackage(name: string): boolean {
  return name.startsWith(JSR_NPM_SCOPE)
}

export function jsrNpmToJsrName(name: string): string {
  if (!isJsrNpmPackage(name))
    return name

  const bare = name.slice(JSR_NPM_SCOPE.length)
  const separatorIndex = bare.indexOf('__')
  if (separatorIndex === -1)
    return bare
  return `@${bare.slice(0, separatorIndex)}/${bare.slice(separatorIndex + 2)}`
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
    version: id.slice(separatorIndex + 1) || null,
  }
}

/**
 * Resolve the maximum version satisfying the given range, capped by the `latest` dist-tag when possible.
 *
 * This first reads the `latest` tag, then selects the highest version that satisfies the range
 * without exceeding that `latest` version.
 *
 * Inspired by:
 * https://github.com/antfu-collective/taze/blob/fed751d777620ddb0a0e77a05ea1412f6332d043/src/utils/versions.ts#L66-L104
 */
function getMaxSatisfying(versions: string[], current: string, tags: PackageInfo['distTags']) {
  let version: string | null = null

  try {
    const range = new Range(current)

    let maxVersion: string | null = tags.latest
    if (!satisfies(maxVersion, range))
      maxVersion = null

    for (const ver of versions) {
      if (!satisfies(ver, range))
        continue

      if (!maxVersion || lte(ver, maxVersion)) {
        if (!version || gt(ver, version)) {
          version = ver
        }
      }
    }
    return version
  } catch {
    return null
  }
}

export function resolveExactVersion(pkg: PackageInfo, version: string) {
  if (version === '' || version === '*')
    version = 'latest'

  if (Object.hasOwn(pkg.distTags, version))
    return pkg.distTags[version]

  const versions = Object.keys(pkg.versionsMeta)
  if (versions.length === 0)
    return null

  return getMaxSatisfying(versions, version, pkg.distTags)
}
