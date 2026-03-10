import type { PackageInfo } from '#api/package'
import type { Engines } from 'fast-npm-meta'
import type { DiagnosticContext } from '../../src/providers/diagnostics'
import { resolveDependencySpec } from '#utils/dependency'
import { resolveExactVersion } from '#utils/package'
import { Uri } from 'vscode'

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
  const pkg = { distTags, versionsMeta } as PackageInfo

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
    resolvedVersion: async () => resolveExactVersion(pkg, resolvedSpec),
    packageInfo: async () => (pkg),
  }
  return { uri: Uri.file('package.json'), dep, pkg }
}
