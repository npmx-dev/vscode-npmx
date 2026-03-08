import type { PackageInfo } from '#utils/api/package'
import type { Engines } from 'fast-npm-meta'
import type { DiagnosticContext } from '../../src/providers/diagnostics'
import { resolveDependencySpec } from '#utils/dependency'

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
  const { name, version, distTags = {}, versionsMeta = {} } = options
  const { protocol, resolvedName, resolvedSpec, resolvedProtocol } = resolveDependencySpec(name, version)
  const pkg = { distTags, versionsMeta, versionToTag: new Map() } as PackageInfo

  const dep: DiagnosticContext['dep'] = {
    category: 'dependencies',
    rawName: name,
    rawSpec: version,
    nameRange: [0, name.length],
    specRange: [0, version.length],
    protocol,
    resolvedName,
    resolvedSpec,
    resolvedProtocol,
    resolvedVersion: async () => '',
    packageInfo: async () => (pkg),
  }
  return { uri, dep, pkg }
}
