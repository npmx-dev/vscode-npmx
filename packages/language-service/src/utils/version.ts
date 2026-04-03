import type { PackageInfo } from 'npmx-language-core/api/package'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import { formatPackageId } from 'npmx-language-core/utils'
import SemVer from 'semver/classes/semver'
import gt from 'semver/functions/gt'

const RANGE_PREFIXES = ['>=', '<=', '=', '>', '<']

function getVersionRangePrefix(v: string): string {
  const ver = v.trim().toLowerCase()

  if (ver === '*' || ver === '')
    return '*'
  if (ver[0] === '~' || ver[0] === '^')
    return ver[0]
  for (const leading of RANGE_PREFIXES) {
    if (ver.startsWith(leading))
      return leading
  }
  if (ver.includes('x')) {
    const parts = ver.split('.')
    if (parts[0] === 'x')
      return '*'
    if (parts[1] === 'x')
      return '^'
    if (parts[2] === 'x')
      return '~'
  }

  return ''
}

const PROTOCOL_PATTERN = /^[a-z]+:/

export function formatUpgradeVersion(dep: DependencyInfo, target: string): string {
  const { rawName, rawSpec, resolvedName, resolvedSpec, protocol } = dep

  const isAlias = resolvedName !== rawName
  const prefix = getVersionRangePrefix(resolvedSpec)
  const result = prefix === '*' ? '*' : `${prefix}${target}`

  if (!isAlias)
    return result

  const declaredProtocol = PROTOCOL_PATTERN.test(rawSpec) ? protocol : null
  if (!declaredProtocol)
    return result

  return `${declaredProtocol}:${formatPackageId(resolvedName, result)}`
}

export type UpgradeType = 'major' | 'minor' | 'patch'

export interface UpgradeTier {
  type: UpgradeType
  version: string
}

export function resolveUpgradeTiers(pkg: PackageInfo, resolvedVersion: string): UpgradeTier[] {
  const current = new SemVer(resolvedVersion)
  const currentMajor = current.major
  const currentMinor = current.minor

  let maxPatch: SemVer | undefined
  let maxMinor: SemVer | undefined
  let maxMajor: SemVer | undefined

  for (const v of Object.keys(pkg.versionsMeta)) {
    const parsed = new SemVer(v, { loose: true })
    if (parsed.prerelease.length > 0 || !gt(parsed, current))
      continue

    if (parsed.major === currentMajor && parsed.minor === currentMinor) {
      if (!maxPatch || gt(parsed, maxPatch))
        maxPatch = parsed
    } else if (parsed.major === currentMajor) {
      if (!maxMinor || gt(parsed, maxMinor))
        maxMinor = parsed
    } else {
      if (!maxMajor || gt(parsed, maxMajor))
        maxMajor = parsed
    }
  }

  const tiers: UpgradeTier[] = []
  if (maxPatch)
    tiers.push({ type: 'patch', version: maxPatch.version })
  if (maxMinor)
    tiers.push({ type: 'minor', version: maxMinor.version })
  if (maxMajor)
    tiers.push({ type: 'major', version: maxMajor.version })
  return tiers
}
