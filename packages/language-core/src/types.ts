export type OffsetRange = [start: number, end: number]

export type DependencyProtocol
  = | 'npm'
    | 'jsr'
    | 'workspace'
    | 'catalog'
    | 'git'
    | 'file'
    | 'http'
    | null

export type DependencyCategory
  = | 'dependencies'
    | 'devDependencies'
    | 'peerDependencies'
    | 'optionalDependencies'
    | 'catalog'
    | 'catalogs'

export interface ExtractedDependencyInfo {
  category: DependencyCategory
  categoryName?: string
  rawName: string
  rawSpec: string
  nameRange: OffsetRange
  specRange: OffsetRange
}

export interface ResolvedDependencyInfo {
  protocol: DependencyProtocol
  categoryName?: string
  resolvedName: string
  resolvedSpec: string
  resolvedProtocol: string
}

interface HasDependenciesInfo {
  dependencies: ExtractedDependencyInfo[]
}

export type Engines = Record<string, string>

export interface PackageManifestInfo extends HasDependenciesInfo {
  name?: string
  version?: string
  packageManager?: string
  engines?: Engines
}

export type CatalogsInfo = Record<string, Record<string, string>>

export interface WorkspaceCatalogInfo extends HasDependenciesInfo {
  catalogs?: CatalogsInfo
}

export interface BaseExtractor<T = unknown> {
  parse: (text: string) => T | null | undefined
  getDependenciesInfo: (root: T) => ExtractedDependencyInfo[]
}

export interface PackageManifestExtractor {
  getPackageManifestInfo: (text: string) => PackageManifestInfo | undefined
}

export interface WorkspaceCatalogExtractor {
  getWorkspaceCatalogInfo: (text: string) => WorkspaceCatalogInfo | undefined
}
