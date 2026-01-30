import type { DocumentLinkProvider, Range, TextDocument } from 'vscode'
import { DocumentLink, Uri } from 'vscode'

export abstract class BaseDocumentLinkProvider implements DocumentLinkProvider {
  createLink(name: string, range: Range) {
    const uri = Uri.parse(`https://npmx.dev/package/${name}`)

    return new DocumentLink(range, uri)
  }

  abstract provideDocumentLinks(document: TextDocument): DocumentLink[] | undefined
}
