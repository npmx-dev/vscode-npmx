import type { Extractor } from '#types/extractor'
import type { DocumentLink, DocumentLinkProvider, TextDocument } from 'vscode'
import { config } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { npmxPackageUrl } from '#utils/links'
import { resolveExactVersion } from '#utils/package'
import { isSupportedProtocol, parseVersion } from '#utils/version'
import { Uri, DocumentLink as VscodeDocumentLink } from 'vscode'

export class NpmxDocumentLinkProvider<T extends Extractor> implements DocumentLinkProvider {
  extractor: T

  constructor(extractor: T) {
    this.extractor = extractor
  }

  async provideDocumentLinks(document: TextDocument): Promise<DocumentLink[]> {
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

      // Skip unsupported protocols (workspace:, file:, git:, link:, jsr:, etc.)
      if (!isSupportedProtocol(parsed.protocol))
        continue

      let targetVersion: string | undefined

      if (config.packageLinks === 'declared') {
        targetVersion = parsed.version
      } else if (config.packageLinks === 'resolved') {
        const pkg = await getPackageInfo(name)
        const exactVersion = pkg ? resolveExactVersion(pkg, parsed.version) : null
        targetVersion = exactVersion ?? parsed.version
      }

      const url = targetVersion
        ? npmxPackageUrl(name, targetVersion)
        : npmxPackageUrl(name)
      // Create link for package name
      const nameRange = this.extractor.getNodeRange(document, nameNode)
      links.push(new VscodeDocumentLink(nameRange, Uri.parse(url)))
    }

    return links
  }
}
