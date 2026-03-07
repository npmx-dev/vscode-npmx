import type { OffsetRange } from '#types/range'
import type { Engines } from 'fast-npm-meta'

export type {
  Node as JsonNode,
} from 'jsonc-parser'

export type {
  Node as YamlNode,
} from 'yaml'

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

export interface PackageManifestInfo {
  name?: string
  version?: string
  packageManager?: string
  engines?: Engines
  dependencies: DependencyInfo[]
}

export interface WorkspaceCatalogInfo {
  catalogs?: Record<string, Record<string, string>>
  dependencies: DependencyInfo[]
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
