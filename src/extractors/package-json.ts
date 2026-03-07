import type { DependencyCategory, DependencyInfo, Extractor } from '#types/extractor'
import type { Engines } from 'fast-npm-meta'
import type { Node } from 'jsonc-parser'
import type { TextDocument } from 'vscode'
import { isInRange } from '#utils/ast'
import { findNodeAtLocation, findNodeAtOffset, parseTree } from 'jsonc-parser'
import { Range } from 'vscode'

const DEPENDENCY_SECTIONS: DependencyCategory[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

export class PackageJsonExtractor implements Extractor<Node> {
  parse = (text: string) => parseTree(text) ?? null

  getNodeRange(doc: TextDocument, node: Node) {
    const start = doc.positionAt(node.offset + 1)
    const end = doc.positionAt(node.offset + node.length - 1)

    return new Range(start, end)
  }

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

  private getDependencySection(root: Node, node: Node): DependencyCategory | undefined {
    return DEPENDENCY_SECTIONS.find((section) => {
      const dep = findNodeAtLocation(root, [section])
      if (!dep || !dep.parent)
        return false

      const { offset, length } = dep.parent.children![1]

      return isInRange(node.offset, [offset, offset + length])
    })
  }

  private parseDependencyNode(node: Node, category: DependencyCategory): DependencyInfo<Node> | undefined {
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
      nameNode,
      specNode,
      versionNode: specNode,
      name: nameNode.value,
      version: specNode.value,
    }
  }

  getDependenciesInfo(root: Node) {
    const result: DependencyInfo<Node>[] = []

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

  getDependencyInfoByOffset(root: Node, offset: number) {
    const node = findNodeAtOffset(root, offset)
    if (!node || node.type !== 'string')
      return

    const category = this.getDependencySection(root, node)
    if (!category)
      return

    return this.parseDependencyNode(node.parent!, category)
  }
}
