import type { DocumentLinkProvider, TextDocument } from 'vscode'
import { findNodeAtLocation } from 'jsonc-parser'
import { DocumentLink, Range, Uri } from 'vscode'
import { getJsonAst } from '../utils/jsonAst'

const sections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

export class PackageJsonLinkProvider implements DocumentLinkProvider {
  provideDocumentLinks(document: TextDocument) {
    if (!document.fileName.endsWith('package.json'))
      return

    const root = getJsonAst(document)
    if (!root)
      return

    const links: DocumentLink[] = []

    sections.forEach((section) => {
      const node = findNodeAtLocation(root, [section])
      if (!node || !node.children)
        return

      for (const dep of node.children) {
        const keyNode = dep.children?.[0]
        if (!keyNode || typeof keyNode.value !== 'string')
          continue

        const name = keyNode.value

        const start = document.positionAt(keyNode.offset + 1)
        const end = document.positionAt(
          keyNode.offset + keyNode.length - 1,
        )

        const range = new Range(start, end)

        const uri = Uri.parse(`https://npmx.dev/package/${name}`)

        links.push(new DocumentLink(range, uri))
      }
    })

    return links
  }
}
