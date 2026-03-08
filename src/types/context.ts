import type { DependencyInfo } from '#types/extractor'
import type { PackageInfo } from '#utils/api/package'

export type PackageManager = 'npm' | 'pnpm' | 'yarn'

export type DependencyProtocol
  = | 'npm'
    | 'jsr'
    | 'workspace'
    | 'catalog'
    | 'git'
    | 'file'
    | 'http'
    | null

export type CatalogsInfo = Record<string, Record<string, string>>

export interface ResolvedDependencyInfo extends DependencyInfo {
  protocol: DependencyProtocol
  resolvedName: string
  resolvedSpec: string
  resolvedProtocol: DependencyProtocol
  packageInfo: () => Promise<PackageInfo | null>
  resolvedVersion: () => Promise<string | null>
}
