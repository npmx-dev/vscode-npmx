import type { DocumentLink, DocumentLinkProvider, TextDocument } from 'vscode'
import { config } from '#state'
import { offsetRangeToRange } from '#utils/ast'
import { npmxPackageUrl } from '#utils/links'
import { getResolvedDependencies } from '#utils/workspace'
import { Uri, DocumentLink as VscodeDocumentLink } from 'vscode'

export class NpmxDocumentLinkProvider implements DocumentLinkProvider {
  async provideDocumentLinks(document: TextDocument): Promise<DocumentLink[]> {
    const dependencies = await getResolvedDependencies(document.uri)
    if (!dependencies)
      return []

    const links: DocumentLink[] = []
    const linkMode = config.packageLinks

    for (const dep of dependencies) {
      if (dep.resolvedProtocol !== 'npm')
        continue

      const { resolvedName, resolvedSpec, nameRange } = dep

      let targetVersion: string | undefined

      if (linkMode === 'declared') {
        targetVersion = resolvedSpec
      } else if (linkMode === 'resolved') {
        targetVersion = await dep.resolvedVersion() ?? resolvedSpec
      }

      const url = targetVersion
        ? npmxPackageUrl(resolvedName, targetVersion)
        : npmxPackageUrl(resolvedName)
      const link = new VscodeDocumentLink(offsetRangeToRange(document, nameRange), Uri.parse(url))
      link.tooltip = `Open ${resolvedName}@${targetVersion ?? 'latest'} on npmx`
      links.push(link)
    }

    return links
  }
}
