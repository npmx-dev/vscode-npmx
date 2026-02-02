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

export function isValidPrefix(c: string) {
  return c === '^' || c === '~'
}

export function extractVersionPrefix(v: string) {
  const firstChar = v[0]
  const valid = isValidPrefix(firstChar)

  return valid ? firstChar : ''
}

export function extractVersion(versionRange: string): string {
  return versionRange.replace(/^[\^~]/, '')
}
