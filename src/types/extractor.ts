import type { Node as JsonNode } from 'jsonc-parser'
import type { Location, Range, TextDocument, Uri } from 'vscode'
import type { Node as YamlNode } from 'yaml'

export type ValidNode = JsonNode | YamlNode

export interface CatalogResolutionInfo {
  catalogName: string
  workspaceUri: Uri
  entryLocation: Location
}

export interface DependencyInfo<T extends ValidNode = any> {
  nameNode: T
  versionNode: T
  name: string
  version: string
  resolvedVersion?: string
  catalogResolution?: CatalogResolutionInfo
}

export interface Extractor<T extends ValidNode = any> {
  parse: (document: TextDocument) => T | null | undefined

  getNodeRange: (document: TextDocument, node: T) => Range

  getDependenciesInfo: (root: T) => DependencyInfo<T>[]

  getDependencyInfoByOffset: (root: T, offset: number) => DependencyInfo<T> | undefined
}
