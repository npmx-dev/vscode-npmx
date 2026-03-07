import type { DocumentLink, DocumentLinkProvider, TextDocument } from 'vscode'
import { config } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { offsetRangeToRange } from '#utils/ast'
import { npmxPackageUrl } from '#utils/links'
import { resolveExactVersion } from '#utils/package'
import { isSupportedProtocol } from '#utils/version'
import { getResolvedDependencies } from '#utils/workspace'
import { Uri, DocumentLink as VscodeDocumentLink } from 'vscode'

export class NpmxDocumentLinkProvider implements DocumentLinkProvider {
  async provideDocumentLinks(document: TextDocument): Promise<DocumentLink[]> {
    const links: DocumentLink[] = []
    const dependencies = await getResolvedDependencies(document.uri)
    const linkMode = config.packageLinks
    const supportedDeps = dependencies.filter(dep => isSupportedProtocol(dep.protocol))

    for (const dep of supportedDeps) {
      const { resolvedName, resolvedSpec, nameRange } = dep

      let targetVersion: string | undefined

      if (linkMode === 'declared') {
        targetVersion = resolvedSpec
      } else if (linkMode === 'resolved') {
        const pkg = await getPackageInfo(resolvedName)
        const exactVersion = pkg ? resolveExactVersion(pkg, resolvedSpec) : null
        targetVersion = exactVersion ?? resolvedSpec
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
