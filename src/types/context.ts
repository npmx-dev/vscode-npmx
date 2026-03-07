import type { DependencyCategory, ValidNode } from '#types/extractor'
import type { PackageInfo } from '#utils/api/package'
import type { Engines } from 'fast-npm-meta'

export type PackageManager = 'npm' | 'pnpm' | 'yarn'

export type DependencyProtocol
  = | 'npm'
    | 'jsr'
    | 'workspace'
    | 'catalog'
    | 'file'
    | 'git'
    | 'http'

export interface WorkspaceContext {
  packageManager: PackageManager
  catalogs?: Record<string, Record<string, string>>
  packages: Map<string, PackageContext>
}

export interface PackageContext {
  workspaceContext: WorkspaceContext
  packageJsonPath: string
  engines?: Engines
  dependencies: Map<string, ResolvedDependencyInfo>
}

export interface ResolvedDependencyInfo {
  category: DependencyCategory
  rawName: string
  rawSpec: string
  nameNode: ValidNode
  specNode: ValidNode
  versionNode: ValidNode
  protocol: DependencyProtocol
  catalogName?: string
  resolvedName: string
  resolvedSpec: string
  packageInfo: () => Promise<PackageInfo | null>
  resolvedVersion: () => Promise<string | null>
}
