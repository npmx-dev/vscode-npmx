import type { DependencyInfo, WorkspaceContext } from 'npmx-language-core/workspace'

export type EditorFlavor = 'unknown' | 'vscode' | 'zed'

export interface IWorkspaceState {
  getEditorFlavor: () => EditorFlavor
  getWorkspaceContext: (uri: string) => Promise<WorkspaceContext | undefined>
  getResolvedDependencies: (uri: string) => Promise<DependencyInfo[] | undefined>
  getResolvedDependenciesForContainingPackage: (uri: string) => Promise<DependencyInfo[] | undefined>
}
