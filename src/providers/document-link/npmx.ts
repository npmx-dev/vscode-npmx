import type { Extractor } from '#types/extractor'
import type { DocumentLink, DocumentLinkProvider, TextDocument } from 'vscode'
import { config } from '#state'
import { npmxPackageUrl } from '#utils/links'
import { isSupportedProtocol, parseVersion } from '#utils/version'
import { Uri, DocumentLink as VscodeDocumentLink } from 'vscode'

export class NpmxDocumentLinkProvider<T extends Extractor> implements DocumentLinkProvider {
  extractor: T

  constructor(extractor: T) {
    this.extractor = extractor
  }

  provideDocumentLinks(document: TextDocument): DocumentLink[] {
    const root = this.extractor.parse(document)
    if (!root)
      return []

    const links: DocumentLink[] = []
    const dependencies = this.extractor.getDependenciesInfo(root)

    for (const dep of dependencies) {
      const { name, version, nameNode } = dep

      const parsed = parseVersion(version)
      if (!parsed)
        continue

      // Skip unsupported protocols (workspace:, file:, git:, link:, etc.)
      if (!isSupportedProtocol(parsed.protocol))
        continue

      // Skip JSR packages (consistent with hover provider)
      if (parsed.protocol === 'jsr')
        continue

      // Generate link URL
      const url = config.documentLinks === 'version' && parsed.version
        ? npmxPackageUrl(name, parsed.version)
        : npmxPackageUrl(name)

      // Create link for package name
      const nameRange = this.extractor.getNodeRange(document, nameNode)
      links.push(new VscodeDocumentLink(nameRange, Uri.parse(url)))
    }

    return links
  }
}
