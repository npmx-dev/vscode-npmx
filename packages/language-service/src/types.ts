import type { CatalogsInfo, Engines } from 'npmx-language-core/types'
import type { DependencyInfo } from 'npmx-language-core/workspace'

export type IconStyle = 'codicon' | 'emoji'

export interface ClientFeatures {
  catalogInlayHints: boolean
  iconStyle: IconStyle
}

export const DEFAULT_CLIENT_FEATURES: ClientFeatures = {
  catalogInlayHints: true,
  iconStyle: 'emoji',
}

export interface IWorkspaceState {
  getClientFeatures: () => ClientFeatures
  getCatalogs: (uri: string) => Promise<CatalogsInfo | undefined>
  findCatalogDependency: (uri: string, dependency: DependencyInfo) => Promise<{
    dependency: DependencyInfo
    path: string
  } | undefined>
  getPackageEngines: (uri: string) => Promise<Engines | undefined>
  getResolvedDependencies: (uri: string) => Promise<DependencyInfo[] | undefined>
  getResolvedDependenciesForContainingPackage: (uri: string) => Promise<DependencyInfo[] | undefined>
  findInstalledPackageManifestPath: (uri: string, packageName: string) => Promise<string | undefined>
}
