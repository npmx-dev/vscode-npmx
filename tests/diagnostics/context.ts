import type { PackageInfo } from '#utils/api/package'
import type { Engines } from 'fast-npm-meta'
import type { DiagnosticContext } from '../../src/providers/diagnostics'
import { resolveDependencySpec } from '#utils/dependency'
import { resolveExactVersion } from '#utils/package'
import { isSupportedProtocol } from '#utils/version'

interface CreateContextOptions {
  name: string
  version: string
  distTags?: Record<string, string>
  versionsMeta?: Record<string, {
    deprecated?: string
    engines?: Engines
  }>
  engines?: Engines
}

export function createContext(options: CreateContextOptions): DiagnosticContext {
  const { name, version, distTags = {}, versionsMeta = {}, engines } = options
  const { protocol, resolvedName, resolvedSpec } = resolveDependencySpec(name, version)
  const dep: DiagnosticContext['dep'] = {
    rawName: name,
    rawSpec: version,
    nameRange: [0, name.length],
    specRange: [0, version.length],
    protocol,
    resolvedName,
    resolvedSpec,
  }
  const pkg = { distTags, versionsMeta, versionToTag: new Map() } as PackageInfo
  const exactVersion = isSupportedProtocol(protocol)
    ? resolveExactVersion(pkg, resolvedSpec)
    : null
  return { dep, name: resolvedName, pkg, exactVersion, engines }
}
