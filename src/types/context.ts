import type { DependencyInfo } from '#types/extractor'
import type { PackageInfo } from '#utils/api/package'
import type { Engines } from 'fast-npm-meta'

export type PackageManager = 'npm' | 'pnpm' | 'yarn'

export type DependencyProtocol
  = | 'npm'
    | 'jsr'
    | 'workspace'
    | 'catalog'

export interface WorkspaceContext {
  packageManager: PackageManager
  catalogs?: Record<string, Record<string, string>>
}

export interface PackageContext {
  workspaceContext: WorkspaceContext
  packageJsonPath: string
  engines?: Engines
  dependencies: Map<string, ResolvedDependencyInfo>
}

export interface ResolvedDependencyInfo extends DependencyInfo {
  protocol: DependencyProtocol | null
  resolvedName: string
  resolvedSpec: string
  packageInfo: () => Promise<PackageInfo | null>
  resolvedVersion: () => Promise<string | null>
}
