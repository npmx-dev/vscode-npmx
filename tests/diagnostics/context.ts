import type { DependencyInfo } from '#types/extractor'
import type { PackageInfo } from '#utils/api/package'
import type { DiagnosticContext } from '../../src/providers/diagnostics'
import { resolveExactVersion } from '#utils/package'
import { isSupportedProtocol, parseVersion } from '#utils/version'

interface CreateContextOptions {
  name: string
  version: string
  distTags?: Record<string, string>
  versionsMeta?: Record<string, { deprecated?: string }>
}

export function createContext(options: CreateContextOptions): DiagnosticContext {
  const { name, version, distTags = {}, versionsMeta = {} } = options
  const dep: DependencyInfo = { name, version, nameNode: {}, versionNode: {} }
  const pkg = { distTags, versionsMeta, versionToTag: new Map() } as PackageInfo
  const parsed = parseVersion(version)
  const exactVersion = parsed && isSupportedProtocol(parsed.protocol)
    ? resolveExactVersion(pkg, parsed.version)
    : null
  return { dep, pkg, parsed, exactVersion }
}
