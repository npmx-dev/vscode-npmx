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
