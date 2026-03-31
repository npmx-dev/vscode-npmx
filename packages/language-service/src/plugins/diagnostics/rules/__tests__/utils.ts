import type { PackageInfo } from 'npmx-language-core/api/package'
import type { Engines } from 'npmx-language-core/types'
import type { DiagnosticContext } from '../../types'
import { resolveDependencySpec, resolveExactVersion } from 'npmx-language-core/utils'

interface CreateContextOptions {
  name: string
  version: string
  distTags?: Record<string, string>
  versionsMeta?: Record<string, {
    deprecated?: string
    engines?: Engines
  }>
  engines?: Engines
  category?: 'dependencies' | 'devDependencies' | 'peerDependencies'
}

export function createContext(options: CreateContextOptions): DiagnosticContext {
  const { name, version, distTags = {}, versionsMeta = {}, category = 'dependencies' } = options
  const { protocol, resolvedName, resolvedSpec, resolvedProtocol } = resolveDependencySpec(name, version)
  const pkg = { distTags, versionsMeta } as PackageInfo

  const dep: DiagnosticContext['dep'] = {
    category,
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
  return { uri: 'file:///package.json', dep, pkg } as DiagnosticContext
}
