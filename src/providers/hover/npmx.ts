import type { Extractor } from '#types/extractor'
import type { HoverProvider, Position, TextDocument } from 'vscode'
import { SPACER } from '#constants'
import { getPackageInfo } from '#utils/api/package'
import { jsrPackageUrl, npmxDocsUrl, npmxPackageUrl } from '#utils/links'
import { isJsrNpmPackage, jsrNpmToJsrName, resolveExactVersion, resolvePackageName } from '#utils/package'
import { isSupportedProtocol, parseVersion } from '#utils/version'
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

    const parsed = parseVersion(dep.version)
    if (!parsed)
      return

    const { protocol, version } = parsed
    const packageName = resolvePackageName(dep.name, parsed)
    if (!packageName)
      return

    if (protocol === 'jsr' || isJsrNpmPackage(packageName)) {
      const jsrMd = new MarkdownString('', true)
      jsrMd.isTrusted = true

      const jsrName = jsrNpmToJsrName(packageName)
      const jsrPackageLink = `[$(package)${SPACER}View on jsr.io](${jsrPackageUrl(jsrName)})`
      jsrMd.appendMarkdown(`${jsrPackageLink} | $(warning) Not on npmx`)
      return new Hover(jsrMd)
    }

    if (!isSupportedProtocol(protocol))
      return

    const pkg = await getPackageInfo(packageName)
    if (!pkg) {
      const errorMd = new MarkdownString('', true)

      errorMd.isTrusted = true
      errorMd.appendMarkdown('$(warning) Unable to fetch package information')

      return new Hover(errorMd)
    }

    const md = new MarkdownString('', true)
    md.isTrusted = true

    const exactVersion = resolveExactVersion(pkg, version)
    if (exactVersion && pkg.versionsMeta[exactVersion]?.provenance)
      md.appendMarkdown(`[$(verified)${SPACER}Verified provenance](${npmxPackageUrl(packageName, version)}#provenance)\n\n`)

    const packageLink = `[$(package)${SPACER}View on npmx.dev](${npmxPackageUrl(packageName)})`
    const docsLink = `[$(book)${SPACER}View docs on npmx.dev](${npmxDocsUrl(packageName, version)})`

    md.appendMarkdown(`${packageLink} | ${docsLink}`)

    return new Hover(md)
  }
}
