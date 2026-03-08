import type { Engines } from 'fast-npm-meta'

export type {
  Node as JsonNode,
} from 'jsonc-parser'

export type {
  Node as YamlNode,
} from 'yaml'

export type OffsetRange = [start: number, end: number]

export type DependencyCategory
  = | 'dependencies'
    | 'devDependencies'
    | 'peerDependencies'
    | 'optionalDependencies'
    | 'catalog'
    | 'catalogs'

export interface DependencyInfo {
  category: DependencyCategory
  categoryName?: string
  rawName: string
  rawSpec: string
  nameRange: OffsetRange
  specRange: OffsetRange
}

interface DependenciesInfo {
  dependencies: DependencyInfo[]
}

export interface PackageManifestInfo extends DependenciesInfo {
  name: string
  version: string
  packageManager?: string
  engines?: Engines
}

export interface WorkspaceCatalogInfo extends DependenciesInfo {
  catalogs?: Record<string, Record<string, string>>
}

export interface Extractor<T = any> {
  parse: (text: string) => T | null | undefined
  getDependenciesInfo: (root: T) => DependencyInfo[]
  getEngines?: (root: T) => Engines | undefined
}

export interface PackageManifestExtractor<T = any> extends Extractor<T> {
  getPackageManifestInfo: (text: string) => PackageManifestInfo | undefined
}

export interface WorkspaceCatalogExtractor<T = any> extends Extractor<T> {
  getWorkspaceCatalogInfo: (text: string) => WorkspaceCatalogInfo | undefined
}
