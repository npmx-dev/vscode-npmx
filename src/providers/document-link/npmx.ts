import type { Extractor } from '#types/extractor'
import type { DocumentLinkProvider, TextDocument } from 'vscode'
import { DocumentLink, Uri } from 'vscode'

export class NpmxDocumentLinkProvider<T extends Extractor> implements DocumentLinkProvider {
  extractor: T

  constructor(extractor: T) {
    this.extractor = extractor
  }

  provideDocumentLinks(document: TextDocument) {
    const root = this.extractor.parse(document)
    if (!root)
      return

    return this.extractor.getDependenciesInfo(root).map(({ nameNode, name }) => {
      const range = this.extractor.getNodeRange(document, nameNode)

      const uri = Uri.parse(`https://npmx.dev/package/${name}`)

      return new DocumentLink(range, uri)
    })
  }
}
