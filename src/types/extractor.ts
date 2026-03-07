import type { OffsetRange } from '#types/range'
import type { Engines } from 'fast-npm-meta'

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

export interface Extractor<T = any> {
  parse: (text: string) => T | null | undefined

  getDependenciesInfo: (root: T) => DependencyInfo[]

  getEngines?: (root: T) => Engines | undefined
}
