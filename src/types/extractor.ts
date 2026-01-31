import type { Range, TextDocument } from 'vscode'

export interface DependencyInfo<T> {
  nameNode: T
  versionNode: T
  name: string
  version: string
}

export interface Extractor<T> {
  parse: (document: TextDocument) => T | null | undefined

  getNodeRange: (document: TextDocument, node: T) => Range

  getDependenciesInfo: (root: T) => DependencyInfo<T>[]

  getDependencyInfoByOffset: (root: T, offset: number) => DependencyInfo<T> | undefined
}
