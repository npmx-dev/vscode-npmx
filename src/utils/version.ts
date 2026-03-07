import { formatPackageId, isJsrNpmPackage, jsrNpmToJsrName } from './package'

type VersionProtocol = 'workspace' | 'catalog' | 'npm' | 'jsr'

const URL_PACKAGE_PATTERN = /^(?:https?:|git\+|github:)/
function isUrlPackage(currentVersion: string) {
  return URL_PACKAGE_PATTERN.test(currentVersion)
}

const UNSUPPORTED_PROTOCOLS = new Set(['workspace', 'catalog', 'jsr'])
const KNOWN_PROTOCOLS = new Set([...UNSUPPORTED_PROTOCOLS, 'npm'])

export interface ParsedVersion {
  protocol: VersionProtocol | null
  aliasName: string | null
  version: string
}

export function isSupportedProtocol(protocol: VersionProtocol | null): boolean {
  return !protocol || !UNSUPPORTED_PROTOCOLS.has(protocol)
}

function isKnownProtocol(protocol: string): protocol is VersionProtocol {
  return KNOWN_PROTOCOLS.has(protocol)
}

export function parseVersion(rawVersion: string): ParsedVersion | null {
  rawVersion = rawVersion.trim()
  if (isUrlPackage(rawVersion))
    return null

  let protocol: string | null = null
  let aliasName: string | null = null
  let version = rawVersion

  const colonIndex = rawVersion.indexOf(':')
  if (colonIndex !== -1) {
    protocol = rawVersion.slice(0, colonIndex)

    if (!isKnownProtocol(protocol))
      return null

    version = rawVersion.substring(colonIndex + 1)

    if (protocol === 'npm') {
      const lastAtIndex = version.lastIndexOf('@')
      if (lastAtIndex > 0) {
        aliasName = version.substring(0, lastAtIndex)
        version = version.substring(lastAtIndex + 1)

        if (isJsrNpmPackage(aliasName)) {
          aliasName = jsrNpmToJsrName(aliasName)
          protocol = 'jsr'
        }
      }
    }
  }

  return { protocol, aliasName, version } as ParsedVersion
}

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

export function formatUpgradeVersion(current: ParsedVersion, target: string): string {
  const prefix = getVersionRangePrefix(current.version)

  const result = prefix === '*' ? '*' : `${prefix}${target}`
  if (!current.protocol)
    return result

  const versionPart = current.aliasName ? formatPackageId(current.aliasName, result) : result
  return `${current.protocol}:${versionPart}`
}
