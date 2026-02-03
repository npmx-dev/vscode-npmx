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

const WORKSPACE_PREFIX = 'workspace:'
const CATALOG_PREFIX = 'catalog:'
const NPM_PREFIX = 'npm:'
const JSR_PREFIX = 'jsr:'

export type VersionProtocol = 'npm' | null

export function parseVersion(rawVersion: string): { prefix: '' | '^' | '~', version: string, protocol: VersionProtocol } | null {
  // Skip special protocols that aren't standard npm versions
  if (
    rawVersion.startsWith(WORKSPACE_PREFIX)
    || rawVersion.startsWith(CATALOG_PREFIX)
    || rawVersion.startsWith(JSR_PREFIX)
  ) {
    return null
  }

  let protocol: VersionProtocol = null
  let versionStr = rawVersion

  // Handle npm: protocol (e.g., npm:^1.0.0)
  if (rawVersion.startsWith(NPM_PREFIX)) {
    protocol = 'npm'
    versionStr = rawVersion.slice(NPM_PREFIX.length)
  }

  const firstChar = versionStr[0]
  const hasPrefix = firstChar === '^' || firstChar === '~'
  const prefix = hasPrefix ? firstChar : ''
  const version = hasPrefix ? versionStr.slice(1) : versionStr

  return { prefix, version, protocol }
}
