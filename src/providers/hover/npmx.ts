import type { Extractor } from '#types/extractor'
import type { HoverProvider, Position, TextDocument } from 'vscode'
import { SPACER } from '#constants'
import { getPackageInfo } from '#utils/api/package'
import { jsrPackageUrl, npmxDocsUrl, npmxPackageUrl } from '#utils/links'
import { resolvePackage } from '#utils/package'
import { isSupportedProtocol } from '#utils/version'
import { Hover, MarkdownString } from 'vscode'

export class NpmxHoverProvider<T extends Extractor> implements HoverProvider {
  extractor: T

  constructor(extractor: T) {
    this.extractor = extractor
  }

  async provideHover(document: TextDocument, position: Position) {
    const root = this.extractor.parse(document)
    if (!root)
      return

    const offset = document.offsetAt(position)
    const dep = this.extractor.getDependencyInfoByOffset(root, offset)
    if (!dep)
      return

    const result = await resolvePackage(document.uri, dep)
    if (!result)
      return

    const { name } = dep
    const { protocol, semver } = result

    if (protocol === 'jsr') {
      const jsrMd = new MarkdownString('', true)
      const jsrUrl = jsrPackageUrl(name, semver)

      jsrMd.isTrusted = true

      const jsrPackageLink = `[$(package)${SPACER}View on jsr.io](${jsrUrl})`
      const npmxWarning = '$(warning) Not on npmx'
      jsrMd.appendMarkdown(`${jsrPackageLink} | ${npmxWarning}`)

      return new Hover(jsrMd)
    }

    if (!isSupportedProtocol(protocol))
      return

    const pkg = await getPackageInfo(name)
    if (!pkg) {
      const errorMd = new MarkdownString('', true)

      errorMd.isTrusted = true
      errorMd.appendMarkdown('$(warning) Unable to fetch package information')

      return new Hover(errorMd)
    }

    const md = new MarkdownString('', true)
    md.isTrusted = true

    const currentVersion = pkg.versionsMeta[semver]
    if (currentVersion) {
      if (currentVersion.provenance)
        md.appendMarkdown(`[$(verified)${SPACER}Verified provenance](${npmxPackageUrl(name, semver)}#provenance)\n\n`)
    }

    const packageLink = `[$(package)${SPACER}View on npmx.dev](${npmxPackageUrl(name)})`
    const docsLink = `[$(book)${SPACER}View docs on npmx.dev](${npmxDocsUrl(name, semver)})`

    md.appendMarkdown(`${packageLink} | ${docsLink}`)

    return new Hover(md)
  }
}
