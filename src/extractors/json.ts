import type { DependencyInfo, Extractor } from '#types/extractor'
import type { Node } from 'jsonc-parser'
import type { TextDocument } from 'vscode'
import { createCachedParse } from '#utils/data'
import { findNodeAtLocation, findNodeAtOffset, parseTree } from 'jsonc-parser'
import { Range } from 'vscode'

const DEP_SECTIONS = [
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

  inDependencySection(root: Node, node: Node) {
    return DEP_SECTIONS.some((section) => {
      const dep = findNodeAtLocation(root, [section])
      if (!dep || !dep.parent)
        return false

      const { offset, length } = dep.parent.children![1]

      return node.offset > offset && node.offset < offset + length
    })
  }

  getDependenciesInfo(root: Node) {
    const info: DependencyInfo<Node>[] = []

    DEP_SECTIONS.forEach((section) => {
      const node = findNodeAtLocation(root, [section])
      if (!node || !node.children)
        return

      for (const dep of node.children) {
        const keyNode = dep.children?.[0]
        if (!keyNode || typeof keyNode.value !== 'string')
          continue

        info.push({
          node: keyNode,
          name: keyNode.value,
          version: '',
        })
      }
    })

    return info
  }

  getDependencyInfoByOffset(root: Node, offset: number) {
    const node = findNodeAtOffset(root, offset)
    if (!node || node.type !== 'string' || !this.inDependencySection(root, node))
      return

    return {
      node,
      name: node.parent!.children![0].value as string,
      version: node.value as string,
    }
  }
}
