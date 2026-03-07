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
    const root = this.extractor.parse(document.getText())
    if (!root)
      return []

    const links: DocumentLink[] = []
    const dependencies = this.extractor.getDependenciesInfo(root)
    const linkMode = config.packageLinks
    // First parse and filter dependencies to minimize unnecessary registry lookups, especially for 'resolved' mode
    const parsedDeps: { dep: typeof dependencies[number], parsed: NonNullable<ReturnType<typeof parseVersion>> }[] = []

    for (const dep of dependencies) {
      const parsed = parseVersion(dep.rawSpec)
      if (!parsed)
        continue

      // Skip unsupported protocols (workspace:, file:, git:, link:, jsr:, etc.)
      if (!isSupportedProtocol(parsed.protocol))
        continue

      parsedDeps.push({ dep, parsed })
    }

    for (const { dep, parsed } of parsedDeps) {
      const { rawName, nameNode } = dep
      const packageName = rawName

      let targetVersion: string | undefined

      if (linkMode === 'declared') {
        targetVersion = parsed.version
      } else if (linkMode === 'resolved') {
        const pkg = await getPackageInfo(packageName)
        const exactVersion = pkg ? resolveExactVersion(pkg, parsed.version) : null
        targetVersion = exactVersion ?? parsed.version
      }

      const url = targetVersion
        ? npmxPackageUrl(packageName, targetVersion)
        : npmxPackageUrl(packageName)
      // Create link for package name
      const nameRange = this.extractor.getNodeRange(document, nameNode)
      const link = new VscodeDocumentLink(nameRange, Uri.parse(url))
      link.tooltip = `Open ${packageName}@${targetVersion ?? 'latest'} on npmx`
      links.push(link)
    }

    return links
  }
}
