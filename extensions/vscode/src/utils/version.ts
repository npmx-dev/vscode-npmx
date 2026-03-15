import type { ResolvedDependencyInfo } from '#types/context'
import { formatPackageId } from './package'

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

export function formatUpgradeVersion(dep: ResolvedDependencyInfo, target: string): string {
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
