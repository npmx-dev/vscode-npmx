import type { DependencyCategory, DependencyInfo, JsonNode, OffsetRange, PackageManifestExtractor } from '#types/extractor'
import type { Engines } from 'fast-npm-meta'
import { findNodeAtLocation, parseTree } from 'jsonc-parser'

const DEPENDENCY_SECTIONS: DependencyCategory[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

export class PackageJsonDocumentExtractor implements PackageManifestExtractor<JsonNode> {
  parse = (text: string) => parseTree(text) ?? null

  private getStringValue(root: JsonNode, key: string): string | undefined {
    const node = findNodeAtLocation(root, [key])
    return typeof node?.value === 'string' ? node.value : undefined
  }

  getPackageName(root: JsonNode): string {
    return this.getStringValue(root, 'name')!
  }

  getPackageVersion(root: JsonNode): string {
    return this.getStringValue(root, 'version')!
  }

  getPackageManager(root: JsonNode): string | undefined {
    return this.getStringValue(root, 'packageManager')
  }

  private getStringNodeRange(node: JsonNode): OffsetRange {
    return [node.offset + 1, node.offset + node.length - 1]
  }

  private parseDependencyNode(node: JsonNode, category: DependencyCategory): DependencyInfo | undefined {
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
      nameRange: this.getStringNodeRange(nameNode),
      specRange: this.getStringNodeRange(specNode),
    }
  }

  getDependenciesInfo(root: JsonNode) {
    const result: DependencyInfo[] = []

    DEPENDENCY_SECTIONS.forEach((section) => {
      const node = findNodeAtLocation(root, [section])
      if (!node || !node.children)
        return

      for (const dep of node.children) {
        const info = this.parseDependencyNode(dep, section)

        if (info)
          result.push(info)
      }
    })

    return result
  }

  getEngines(root: JsonNode): Engines | undefined {
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

  getPackageManifestInfo(text: string) {
    const root = this.parse(text)
    if (!root)
      return

    return {
      name: this.getPackageName(root),
      version: this.getPackageVersion(root),
      packageManager: this.getPackageManager(root),
      engines: this.getEngines(root),
      dependencies: this.getDependenciesInfo(root),
    }
  }
}
