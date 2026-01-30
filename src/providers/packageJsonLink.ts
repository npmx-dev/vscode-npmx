import type { DocumentLinkProvider, TextDocument } from 'vscode'
import { findNodeAtLocation } from 'jsonc-parser'
import { DocumentLink, Uri } from 'vscode'
import { DEP_SECTIONS } from '../utils/constants'
import { getJsonAst, getNodeRange } from '../utils/jsonAst'

export class PackageJsonLinkProvider implements DocumentLinkProvider {
  provideDocumentLinks(document: TextDocument) {
    if (!document.fileName.endsWith('package.json'))
      return

    const root = getJsonAst(document)
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
        const uri = Uri.parse(`https://npmx.dev/package/${keyNode.value}`)

        links.push(new DocumentLink(range, uri))
      }
    })

    return links
  }
}
