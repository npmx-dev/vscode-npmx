import type { Extractor } from '#types/extractor'
import type { DocumentLink, DocumentLinkProvider, TextDocument } from 'vscode'
import { config, logger } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { npmxPackageUrl } from '#utils/links'
import { resolveExactVersion } from '#utils/package'
import { isSupportedProtocol, parseVersion } from '#utils/version'
import { Uri, DocumentLink as VscodeDocumentLink } from 'vscode'

// Limit concurrent lookups to avoid overwhelming the registry and hitting rate limits
const RESOLVED_LOOKUP_CONCURRENCY = 6

type PackageInfoResult = Awaited<ReturnType<typeof getPackageInfo>>

export class NpmxDocumentLinkProvider<T extends Extractor> implements DocumentLinkProvider {
  extractor: T

  constructor(extractor: T) {
    this.extractor = extractor
  }

  private async fetchResolvedPackageInfoMap(names: string[]): Promise<Map<string, PackageInfoResult>> {
    const packageInfoMap = new Map<string, PackageInfoResult>()

    for (let i = 0; i < names.length; i += RESOLVED_LOOKUP_CONCURRENCY) {
      const batch = names.slice(i, i + RESOLVED_LOOKUP_CONCURRENCY)
      const results = await Promise.allSettled(batch.map(async (name) => [name, await getPackageInfo(name)] as const))

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const [name, pkg] = result.value
          packageInfoMap.set(name, pkg)
        }
      }

      for (const [index, result] of results.entries()) {
        if (result.status === 'rejected') {
          const name = batch[index]
          logger.warn(`[package-link] failed to fetch package info for ${name}: ${String(result.reason)}`)
        }
      }
    }

    return packageInfoMap
  }

  async provideDocumentLinks(document: TextDocument): Promise<DocumentLink[]> {
    const root = this.extractor.parse(document)
    if (!root)
      return []

    const links: DocumentLink[] = []
    const dependencies = this.extractor.getDependenciesInfo(root)
    const linkMode = config.packageLinks
    // First parse and filter dependencies to minimize unnecessary registry lookups, especially for 'resolved' mode
    const parsedDeps: { dep: typeof dependencies[number], parsed: NonNullable<ReturnType<typeof parseVersion>> }[] = []

    for (const dep of dependencies) {
      const parsed = parseVersion(dep.version)
      if (!parsed)
        continue

      // Skip unsupported protocols (workspace:, file:, git:, link:, jsr:, etc.)
      if (!isSupportedProtocol(parsed.protocol))
        continue

      parsedDeps.push({ dep, parsed })
    }

    let packageInfoMap = new Map<string, PackageInfoResult>()

    if (linkMode === 'resolved') {
      const names = [...new Set(parsedDeps.map(({ dep }) => dep.name))]
      packageInfoMap = await this.fetchResolvedPackageInfoMap(names)
    }

    for (const { dep, parsed } of parsedDeps) {
      const { name, nameNode } = dep

      let targetVersion: string | undefined

      if (linkMode === 'declared') {
        targetVersion = parsed.version
      } else if (linkMode === 'resolved') {
        const pkg = packageInfoMap.get(name)
        const exactVersion = pkg ? resolveExactVersion(pkg, parsed.version) : null
        targetVersion = exactVersion ?? parsed.version
      }

      const url = targetVersion
        ? npmxPackageUrl(name, targetVersion)
        : npmxPackageUrl(name)
      // Create link for package name
      const nameRange = this.extractor.getNodeRange(document, nameNode)
      const link = new VscodeDocumentLink(nameRange, Uri.parse(url))
      link.tooltip = `Open ${name}@${targetVersion ?? 'latest'} on npmx`
      links.push(link)
    }

    return links
  }
}
