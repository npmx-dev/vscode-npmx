import type { PackageInfo } from './api/package'
import type { ParsedVersion } from './version'
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

export function resolvePackageName(depName: string, parsed: ParsedVersion | null): string {
  return parsed?.aliasName ?? depName
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

export function resolveExactVersion(pkg: PackageInfo, version: string) {
  if (Object.hasOwn(pkg.distTags, version))
    return pkg.distTags[version]

  return maxSatisfying(Object.keys(pkg.versionsMeta), version)
}
