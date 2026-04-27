import type { DependencyInfo, WorkspaceContext } from 'npmx-language-core/workspace'

export interface ClientFeatures {
  catalogInlayHints: boolean
  markdownIcons: boolean
}

export interface IWorkspaceState {
  getClientFeatures: () => ClientFeatures
  getWorkspaceContext: (uri: string) => Promise<WorkspaceContext | undefined>
  getResolvedDependencies: (uri: string) => Promise<DependencyInfo[] | undefined>
  getResolvedDependenciesForContainingPackage: (uri: string) => Promise<DependencyInfo[] | undefined>
}
