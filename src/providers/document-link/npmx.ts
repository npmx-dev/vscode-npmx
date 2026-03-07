import type { DocumentLink, DocumentLinkProvider, TextDocument } from 'vscode'
import { config } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { offsetRangeToRange } from '#utils/ast'
import { npmxPackageUrl } from '#utils/links'
import { resolveExactVersion } from '#utils/package'
import { isSupportedProtocol, parseVersion } from '#utils/version'
import { getResolvedDependencies } from '#utils/workspace-context'
import { Uri, DocumentLink as VscodeDocumentLink } from 'vscode'

export class NpmxDocumentLinkProvider implements DocumentLinkProvider {
  async provideDocumentLinks(document: TextDocument): Promise<DocumentLink[]> {
    const links: DocumentLink[] = []
    const dependencies = await getResolvedDependencies(document.uri)
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
      const { rawName, nameRange } = dep
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
      const link = new VscodeDocumentLink(offsetRangeToRange(document, nameRange), Uri.parse(url))
      link.tooltip = `Open ${packageName}@${targetVersion ?? 'latest'} on npmx`
      links.push(link)
    }

    return links
  }
}
