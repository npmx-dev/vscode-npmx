export type VersionProtocol = 'workspace' | 'catalog' | 'npm' | 'jsr' | null

const KNOWN_PROTOCOLS = new Set<VersionProtocol>(['workspace', 'catalog', 'npm', 'jsr'])
const URL_PREFIXES = ['http://', 'https://', 'git://', 'git+']
const UNSUPPORTED_PROTOCOLS = new Set<VersionProtocol>(['workspace', 'catalog', 'jsr'])

export interface ParsedVersion {
  protocol: VersionProtocol
  prefix: '' | '^' | '~'
  semver: string
}

export function isSupportedProtocol(protocol: VersionProtocol): boolean {
  return !UNSUPPORTED_PROTOCOLS.has(protocol)
}

export function formatVersion(parsed: ParsedVersion): string {
  const protocol = parsed.protocol ? `${parsed.protocol}:` : ''
  return `${protocol}${parsed.prefix}${parsed.semver}`
}

export function parseVersion(rawVersion: string): ParsedVersion | null {
  rawVersion = rawVersion.trim()
  if (URL_PREFIXES.some((p) => rawVersion.startsWith(p)))
    return null

  let protocol: VersionProtocol = null
  let versionStr = rawVersion

  const colonIndex = rawVersion.indexOf(':')
  if (colonIndex !== -1) {
    protocol = rawVersion.slice(0, colonIndex) as VersionProtocol

    if (!KNOWN_PROTOCOLS.has(protocol))
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

function comparePrerelease(a: string, b: string): number {
  const pa = a.split('.')
  const pb = b.split('.')
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (i >= pa.length)
      return -1
    if (i >= pb.length)
      return 1
    const na = Number(pa[i])
    const nb = Number(pb[i])
    if (!Number.isNaN(na) && !Number.isNaN(nb)) {
      if (na !== nb)
        return na - nb
    } else if (pa[i] !== pb[i]) {
      return pa[i] < pb[i] ? -1 : 1
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
  return comparePrerelease(preA, preB) < 0
}
