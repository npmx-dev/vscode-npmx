import type { Node as JsonNode } from 'jsonc-parser'
import type {
  BaseExtractor,
  DependencyCategory,
  Engines,
  ExtractedDependencyInfo,
  OffsetRange,
  PackageManifestExtractor,
  PackageManifestInfo,
  WorkspaceCatalogExtractor,
  WorkspaceCatalogInfo,
} from '../types'
import { findNodeAtLocation, parseTree } from 'jsonc-parser'
import { normalizeCatalogName } from '../utils'

const DEPENDENCY_SECTIONS: DependencyCategory[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

interface CatalogMeta {
  category: 'catalog' | 'catalogs'
  categoryName?: string
}

const CATALOG_NODE_PATHS: {
  path: string[]
  meta: CatalogMeta
}[] = [
  { path: ['catalog'], meta: { category: 'catalog', categoryName: '' } },
  { path: ['catalogs'], meta: { category: 'catalogs' } },
  { path: ['workspaces', 'catalog'], meta: { category: 'catalog', categoryName: '' } },
  { path: ['workspaces', 'catalogs'], meta: { category: 'catalogs' } },
]

export class JsonExtractor implements PackageManifestExtractor, WorkspaceCatalogExtractor, BaseExtractor<JsonNode> {
  parse = (text: string) => parseTree(text) ?? null

  #getStringValue(root: JsonNode, key: string): string | undefined {
    const node = findNodeAtLocation(root, [key])
    return typeof node?.value === 'string' ? node.value : undefined
  }

  #getStringNodeRange(node: JsonNode): OffsetRange {
    return [node.offset + 1, node.offset + node.length - 1]
  }

  #parseDependencyNode(node: JsonNode, category: DependencyCategory): ExtractedDependencyInfo | undefined {
    if (!node.children?.length)
      return

    const [nameNode, specNode] = node.children

    if (
      typeof nameNode?.value !== 'string'
      || typeof specNode?.value !== 'string'
    ) {
      return
    }

    return {
      category,
      rawName: nameNode.value,
      rawSpec: specNode.value,
      nameRange: this.#getStringNodeRange(nameNode),
      specRange: this.#getStringNodeRange(specNode),
    }
  }

  #parseCatalogEntries(node: JsonNode, meta: CatalogMeta): ExtractedDependencyInfo[] {
    if (node.type !== 'object' || !node.children)
      return []

    if (meta.category === 'catalog') {
      return node.children
        .map((entry) => this.#parseDependencyNode(entry, meta.category))
        .flatMap((dependency) => dependency
          ? [{ ...dependency, categoryName: meta.categoryName }]
          : [])
    }

    const result: ExtractedDependencyInfo[] = []

    for (const catalogNode of node.children) {
      const [nameNode, valueNode] = catalogNode.children ?? []
      if (typeof nameNode?.value !== 'string' || valueNode?.type !== 'object' || !valueNode.children)
        continue

      for (const entry of valueNode.children) {
        const dependency = this.#parseDependencyNode(entry, meta.category)
        if (!dependency)
          continue

        result.push({
          ...dependency,
          categoryName: nameNode.value,
        })
      }
    }

    return result
  }

  #getEngines(root: JsonNode): Engines | undefined {
    const enginesNode = findNodeAtLocation(root, ['engines'])
    if (enginesNode?.type !== 'object' || !enginesNode.children?.length)
      return

    let engines: Engines | undefined

    for (const engineNode of enginesNode.children) {
      const [nameNode, rangeNode] = engineNode.children ?? []
      if (typeof nameNode?.value !== 'string' || typeof rangeNode?.value !== 'string')
        continue

      engines ??= {}
      engines[nameNode.value] = rangeNode.value
    }

    return engines
  }

  getDependenciesInfo(root: JsonNode) {
    const result: ExtractedDependencyInfo[] = []

    DEPENDENCY_SECTIONS.forEach((section) => {
      const node = findNodeAtLocation(root, [section])
      if (!node || !node.children)
        return

      for (const dep of node.children) {
        const info = this.#parseDependencyNode(dep, section)

        if (info)
          result.push(info)
      }
    })

    return result
  }

  getWorkspaceCatalogInfo(text: string): WorkspaceCatalogInfo | undefined {
    const root = this.parse(text)
    if (!root)
      return

    const dependencies = CATALOG_NODE_PATHS.flatMap(({ path, meta }) => {
      const node = findNodeAtLocation(root, path)
      return node ? this.#parseCatalogEntries(node, meta) : []
    })

    const catalogs: Record<string, Record<string, string>> = {}

    for (const dependency of dependencies) {
      const categoryName = normalizeCatalogName(dependency.categoryName ?? '')
      catalogs[categoryName] ??= {}
      catalogs[categoryName][dependency.rawName] = dependency.rawSpec
    }

    return {
      dependencies,
      catalogs: Object.keys(catalogs).length > 0 ? catalogs : undefined,
    }
  }

  getPackageManifestInfo(text: string): PackageManifestInfo | undefined {
    const root = this.parse(text)
    if (!root)
      return

    return {
      name: this.#getStringValue(root, 'name'),
      version: this.#getStringValue(root, 'version'),
      packageManager: this.#getStringValue(root, 'packageManager'),
      engines: this.#getEngines(root),
      dependencies: this.getDependenciesInfo(root),
    }
  }
}
