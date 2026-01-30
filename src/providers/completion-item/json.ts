import type { Node } from 'jsonc-parser'
import type { Position, TextDocument } from 'vscode'
import { PACKAGE_JSON_PATTERN } from '#constants'
import { config } from '#state'
import { getNodeRange, isInDepSection, parse } from '#utils/ast/json'
import { findNodeAtOffset } from 'jsonc-parser'
import { languages } from 'vscode'
import { BaseCompletionItemProvider, triggerChars } from './base'

class JsonCompletionItemProvider extends BaseCompletionItemProvider<Node> {
  getDepInfo(document: TextDocument, position: Position) {
    const offset = document.offsetAt(position)

    const root = parse(document)
    if (!root)
      return

    const node = findNodeAtOffset(root, offset)
    if (!node || node.type !== 'string' || !isInDepSection(root, node))
      return

    return {
      node,
      name: node.parent!.children![0].value as string,
      version: node.value as string,
    }
  }

  getReplacingRange(document: TextDocument, node: Node) {
    return getNodeRange(document, node)
  }
}

export function registerJsonCompletionItemProvider() {
  if (config.versionCompletion === 'off')
    return
  return languages.registerCompletionItemProvider(
    { pattern: PACKAGE_JSON_PATTERN },
    new JsonCompletionItemProvider(),
    ...triggerChars,
  )
}
