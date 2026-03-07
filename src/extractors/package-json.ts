import type { DependencyCategory, DependencyInfo, Extractor } from '#types/extractor'
import type { OffsetRange } from '#types/range'
import type { Engines } from 'fast-npm-meta'
import type { Node } from 'jsonc-parser'
import { findNodeAtLocation, parseTree } from 'jsonc-parser'

const DEPENDENCY_SECTIONS: DependencyCategory[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

export class PackageJsonExtractor implements Extractor<Node> {
  parse = (text: string) => parseTree(text) ?? null

  private getStringValue(root: Node, key: string): string | undefined {
    const node = findNodeAtLocation(root, [key])
    return typeof node?.value === 'string' ? node.value : undefined
  }

  getPackageName(root: Node): string | undefined {
    return this.getStringValue(root, 'name')
  }

  getPackageVersion(root: Node): string | undefined {
    return this.getStringValue(root, 'version')
  }

  getPackageManager(root: Node): string | undefined {
    return this.getStringValue(root, 'packageManager')
  }

  private getStringNodeRange(node: Node): OffsetRange {
    return [node.offset + 1, node.offset + node.length - 1]
  }

  private parseDependencyNode(node: Node, category: DependencyCategory): DependencyInfo | undefined {
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

  getDependenciesInfo(root: Node) {
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

  getEngines(root: Node): Engines | undefined {
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
}
