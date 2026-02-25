type VersionProtocol = 'workspace' | 'catalog' | 'npm' | 'jsr' | null

const URL_PREFIXES = ['http://', 'https://', 'git://', 'git+']
const UNSUPPORTED_PROTOCOLS = new Set(['workspace', 'catalog', 'jsr'])
const KNOWN_PROTOCOLS = new Set([...UNSUPPORTED_PROTOCOLS, 'npm'])

export interface ParsedVersion {
  protocol: VersionProtocol
  prefix: '' | '^' | '~'
  semver: string
}

export function isSupportedProtocol(protocol: VersionProtocol): boolean {
  return !protocol || !UNSUPPORTED_PROTOCOLS.has(protocol)
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
