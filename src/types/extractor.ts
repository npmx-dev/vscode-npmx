import type { Engines } from 'fast-npm-meta'
import type { Node as JsonNode } from 'jsonc-parser'
import type { Range, TextDocument } from 'vscode'
import type { Node as YamlNode } from 'yaml'

export type ValidNode = JsonNode | YamlNode

export type DependencyCategory
  = | 'dependencies'
    | 'devDependencies'
    | 'peerDependencies'
    | 'optionalDependencies'
    | 'catalog'
    | 'catalogs'

export interface DependencyInfo<T extends ValidNode = any> {
  category: DependencyCategory
  rawName: string
  rawSpec: string
  nameNode: T
  specNode: T
  versionNode: T
  catalogName?: string
  // Backward-compatible aliases used by current providers.
  name: string
  version: string
}

export interface Extractor<T extends ValidNode = any> {
  parse: (text: string) => T | null | undefined

  getNodeRange: (document: TextDocument, node: T) => Range

  getDependenciesInfo: (root: T) => DependencyInfo<T>[]

  getDependencyInfoByOffset: (root: T, offset: number) => DependencyInfo<T> | undefined

  getEngines?: (root: T) => Engines | undefined
}
