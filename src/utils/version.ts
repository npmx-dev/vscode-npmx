type VersionProtocol = 'workspace' | 'catalog' | 'npm' | 'jsr' | null

const URL_PREFIXES = ['http://', 'https://', 'git://', 'git+']
const UNSUPPORTED_PROTOCOLS = new Set(['workspace', 'catalog', 'jsr'])
const KNOWN_PROTOCOLS = new Set([...UNSUPPORTED_PROTOCOLS, 'npm'])
const DIST_TAG_PATTERN = /^[a-z][\w.-]*$/i
const V_PREFIXED_SEMVER_PATTERN = /^v(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){2}(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

export interface ParsedVersion {
  protocol: VersionProtocol
  prefix: '' | '^' | '~'
  semver: string
}

export function isSupportedProtocol(protocol: VersionProtocol): boolean {
  return !protocol || !UNSUPPORTED_PROTOCOLS.has(protocol)
}

export function isDistTagLike(version: string): boolean {
  if (V_PREFIXED_SEMVER_PATTERN.test(version))
    return false

  return DIST_TAG_PATTERN.test(version)
}

export function formatVersion(parsed: ParsedVersion): string {
  const protocol = parsed.protocol ? `${parsed.protocol}:` : ''
  return `${protocol}${parsed.prefix}${parsed.semver}`
}

function isKnownProtocol(protocol: string): protocol is NonNullable<VersionProtocol> {
  return KNOWN_PROTOCOLS.has(protocol)
}

export function parseVersion(rawVersion: string): ParsedVersion | null {
  rawVersion = rawVersion.trim()
  if (URL_PREFIXES.some((p) => rawVersion.startsWith(p)))
    return null

  let protocol: string | null = null
  let versionStr = rawVersion

  const colonIndex = rawVersion.indexOf(':')
  if (colonIndex !== -1) {
    protocol = rawVersion.slice(0, colonIndex)

    if (!isKnownProtocol(protocol))
      return null

    versionStr = rawVersion.slice(colonIndex + 1)
  }

  const firstChar = versionStr[0]
  const hasPrefix = firstChar === '^' || firstChar === '~'
  const prefix = hasPrefix ? firstChar : ''
  const semver = hasPrefix ? versionStr.slice(1) : versionStr

  return { protocol, prefix, semver }
}

export function getPrereleaseId(version: string): string | null {
  const idx = version.indexOf('-')
  if (idx === -1)
    return null
  const pre = version.slice(idx + 1).split('.')[0]
  return pre || null
}

/**
 * Compare two pre-release strings part by part following SemVer precedence rules.
 *
 * Numeric parts are compared as numbers, string parts are compared lexicographically.
 * A version with fewer parts is less than one with more parts when all preceding parts are equal.
 */
function comparePrereleasePrecedence(a: string, b: string): number {
  const partsA = a.split('.')
  const partsB = b.split('.')

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    if (i >= partsA.length)
      return -1
    if (i >= partsB.length)
      return 1

    const numA = Number(partsA[i])
    const numB = Number(partsB[i])
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      return numA - numB
    } else if (partsA[i] !== partsB[i]) {
      return partsA[i] < partsB[i] ? -1 : 1
    }
  }

  return 0
}

export function lt(a: string, b: string): boolean {
  const [coreA, preA] = a.split('-', 2)
  const [coreB, preB] = b.split('-', 2)
  const partsA = coreA.split('.').map(Number)
  const partsB = coreB.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0)
    if (diff !== 0)
      return diff < 0
  }
  if (preA && !preB)
    return true
  if (!preA || !preB)
    return false
  return comparePrereleasePrecedence(preA, preB) < 0
}
