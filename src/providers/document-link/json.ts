import type { DocumentLink, TextDocument } from 'vscode'
import { DEP_SECTIONS, PACKAGE_JSON_PATTERN } from '#constants'
import { getNodeRange, parse } from '#utils/ast/json'
import { findNodeAtLocation } from 'jsonc-parser'
import { languages } from 'vscode'
import { BaseDocumentLinkProvider } from './base'

class JsonDocumentLinkProvider extends BaseDocumentLinkProvider {
  provideDocumentLinks(document: TextDocument) {
    const root = parse(document)
    if (!root)
      return

    const links: DocumentLink[] = []

    DEP_SECTIONS.forEach((section) => {
      const node = findNodeAtLocation(root, [section])
      if (!node || !node.children)
        return

      for (const dep of node.children) {
        const keyNode = dep.children?.[0]
        if (!keyNode || typeof keyNode.value !== 'string')
          continue

        const range = getNodeRange(document, keyNode)
        links.push(this.createLink(keyNode.value, range))
      }
    })

    return links
  }
}

export function registerJsonDocumentLinkProvider() {
  return languages.registerDocumentLinkProvider(
    { pattern: PACKAGE_JSON_PATTERN },
    new JsonDocumentLinkProvider(),
  )
}
