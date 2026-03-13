import type { Engines } from 'fast-npm-meta'
import type { PackageInfo } from '../../src/api/package'
import type { DiagnosticContext } from '../../src/providers/diagnostics'
import { Uri } from 'vscode'
import { resolveDependencySpec } from '../../src/utils/dependency'
import { resolveExactVersion } from '../../src/utils/package'

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
