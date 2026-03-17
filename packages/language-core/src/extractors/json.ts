import type { Node as JsonNode } from 'jsonc-parser'
import type { BaseExtractor, DependencyCategory, Engines, ExtractedDependencyInfo, OffsetRange, PackageManifestExtractor, PackageManifestInfo } from '../types'
import { findNodeAtLocation, parseTree } from 'jsonc-parser'

const DEPENDENCY_SECTIONS: DependencyCategory[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

export class JsonExtractor implements PackageManifestExtractor, BaseExtractor<JsonNode> {
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
