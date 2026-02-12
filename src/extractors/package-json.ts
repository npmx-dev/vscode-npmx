import type { DependencyInfo, Extractor } from '#types/extractor'
import type { Node } from 'jsonc-parser'
import type { TextDocument } from 'vscode'
import { isInRange } from '#utils/ast'
import { createMemoizedParse } from '#utils/memoize'
import { findNodeAtLocation, findNodeAtOffset, parseTree } from 'jsonc-parser'
import { Range } from 'vscode'

const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

const parse = createMemoizedParse((text) => parseTree(text) ?? null)

function getNodeRange(doc: TextDocument, node: Node) {
  const start = doc.positionAt(node.offset + 1)
  const end = doc.positionAt(node.offset + node.length - 1)

  return new Range(start, end)
}

function isInDependencySection(root: Node, node: Node) {
  return DEPENDENCY_SECTIONS.some((section) => {
    const dep = findNodeAtLocation(root, [section])
    if (!dep || !dep.parent)
      return false

    const { offset, length } = dep.parent.children![1]

    return isInRange(node.offset, [offset, offset + length])
  })
}

function parseDependencyNode(node: Node): DependencyInfo<Node> | undefined {
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

export const packageJsonExtractor: Extractor<Node> = {
  parse,

  getNodeRange,

  getDependenciesInfo(root) {
    const result: DependencyInfo<Node>[] = []

    DEPENDENCY_SECTIONS.forEach((section) => {
      const node = findNodeAtLocation(root, [section])
      if (!node || !node.children)
        return

      for (const dep of node.children) {
        const info = parseDependencyNode(dep)

        if (info)
          result.push(info)
      }
    })

    return result
  },

  getDependencyInfoByOffset(root, offset) {
    const node = findNodeAtOffset(root, offset)
    if (!node || node.type !== 'string' || !isInDependencySection(root, node))
      return

    return parseDependencyNode(node.parent!)
  },
}
