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
  getClientFeatures: () => ClientFeatures
  getWorkspaceContext: (uri: string) => Promise<WorkspaceContext | undefined>
  getResolvedDependencies: (uri: string) => Promise<DependencyInfo[] | undefined>
  getResolvedDependenciesForContainingPackage: (uri: string) => Promise<DependencyInfo[] | undefined>
}
