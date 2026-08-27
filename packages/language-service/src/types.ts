import type { CatalogsInfo, Engines } from 'npmx-language-core/types'
import type { DependencyInfo, WorkspaceContext } from 'npmx-language-core/workspace'

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
  findCatalogDependency: (uri: string, dependency: DependencyInfo) => Promise<{
    dependency: DependencyInfo
    path: string
  } | undefined>
  findInstalledPackageManifestPath: (uri: string, packageName: string) => Promise<string | undefined>
  getCatalogs: (uri: string) => Promise<CatalogsInfo | undefined>
  getClientFeatures: () => ClientFeatures
  getPackageEngines: (uri: string) => Promise<Engines | undefined>
  getWorkspaceContext: (uri: string) => Promise<WorkspaceContext | undefined>
  getResolvedDependencies: (uri: string) => Promise<DependencyInfo[] | undefined>
  getResolvedDependenciesForContainingPackage: (uri: string) => Promise<DependencyInfo[] | undefined>
}
