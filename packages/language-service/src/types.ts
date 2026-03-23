import type { DependencyInfo, WorkspaceContext } from 'npmx-language-core/workspace'

export interface IWorkspaceState {
  getWorkspaceContext: (uri: string) => Promise<WorkspaceContext | undefined>
  getResolvedDependencies: (uri: string) => Promise<DependencyInfo[] | undefined>
  getResolvedDependenciesForContainingPackage: (uri: string) => Promise<DependencyInfo[] | undefined>
}
