import type { DependencyInfo, Extractor } from '#types/extractor'
import type { Node } from 'jsonc-parser'
import type { TextDocument } from 'vscode'
import { isInRange } from '#utils/ast'
import { createCachedParse } from '#utils/data'
import { findNodeAtLocation, findNodeAtOffset, parseTree } from 'jsonc-parser'
import { Range } from 'vscode'

const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

export class JsonExtractor implements Extractor<Node> {
  parse = createCachedParse(parseTree)

  getNodeRange(doc: TextDocument, node: Node) {
    const start = doc.positionAt(node.offset + 1)
    const end = doc.positionAt(node.offset + node.length - 1)

    return new Range(start, end)
  }

  isInDependencySection(root: Node, node: Node) {
    return DEPENDENCY_SECTIONS.some((section) => {
      const dep = findNodeAtLocation(root, [section])
      if (!dep || !dep.parent)
        return false

      const { offset, length } = dep.parent.children![1]

      return isInRange(node.offset, [offset, offset + length])
    })
  }

  private parseDependencyNode(node: Node): DependencyInfo<Node> | undefined {
    if (!node.children?.length)
      return

    const [nameNode, versionNode] = node.children

    if (
      typeof nameNode?.value !== 'string'
      || typeof versionNode.value !== 'string'
    ) {
      return
    }

    return {
      nameNode,
      versionNode,
      name: nameNode.value,
      version: versionNode.value,
    }
  }

  getDependenciesInfo(root: Node) {
    const result: DependencyInfo<Node>[] = []

    DEPENDENCY_SECTIONS.forEach((section) => {
      const node = findNodeAtLocation(root, [section])
      if (!node || !node.children)
        return

      for (const dep of node.children) {
        const info = this.parseDependencyNode(dep)

        if (info)
          result.push(info)
      }
    })

    return result
  }

  getDependencyInfoByOffset(root: Node, offset: number) {
    const node = findNodeAtOffset(root, offset)
    if (!node || node.type !== 'string' || !this.isInDependencySection(root, node))
      return

    return this.parseDependencyNode(node.parent!)
  }
}
