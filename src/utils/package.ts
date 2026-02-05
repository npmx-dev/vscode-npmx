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
  // Skip URL-based versions
  if (URL_PREFIXES.some((p) => rawVersion.startsWith(p)))
    return null

  let protocol: VersionProtocol = null
  let versionStr = rawVersion

  // Parse protocol if present (e.g., npm:^1.0.0 -> protocol: 'npm')
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
