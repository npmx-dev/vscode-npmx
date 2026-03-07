import type { HoverProvider, Position, TextDocument } from 'vscode'
import { SPACER } from '#constants'
import { getPackageInfo } from '#utils/api/package'
import { jsrPackageUrl, npmxDocsUrl, npmxPackageUrl } from '#utils/links'
import { isJsrNpmPackage, jsrNpmToJsrName, resolveExactVersion } from '#utils/package'
import { isSupportedProtocol } from '#utils/version'
import { getResolvedDependencyByOffset } from '#utils/workspace-context'
import { Hover, MarkdownString } from 'vscode'

export class NpmxHoverProvider implements HoverProvider {
  async provideHover(document: TextDocument, position: Position) {
    const offset = document.offsetAt(position)
    const dep = await getResolvedDependencyByOffset(document.uri, offset)
    if (!dep)
      return

    const { protocol, resolvedName, resolvedSpec } = dep

    if (protocol === 'jsr' || isJsrNpmPackage(resolvedName)) {
      const jsrMd = new MarkdownString('', true)
      jsrMd.isTrusted = true

      const jsrName = jsrNpmToJsrName(resolvedName)
      const jsrPackageLink = `[$(package)${SPACER}View on jsr.io](${jsrPackageUrl(jsrName)})`
      jsrMd.appendMarkdown(`${jsrPackageLink} | $(warning) Not on npmx`)
      return new Hover(jsrMd)
    }

    if (!isSupportedProtocol(protocol))
      return

    const pkg = await getPackageInfo(resolvedName)
    if (!pkg) {
      const errorMd = new MarkdownString('', true)

      errorMd.isTrusted = true
      errorMd.appendMarkdown('$(warning) Unable to fetch package information')

      return new Hover(errorMd)
    }

    const md = new MarkdownString('', true)
    md.isTrusted = true

    const exactVersion = resolveExactVersion(pkg, resolvedSpec)
    if (exactVersion && pkg.versionsMeta[exactVersion]?.provenance)
      md.appendMarkdown(`[$(verified)${SPACER}Verified provenance](${npmxPackageUrl(resolvedName, resolvedSpec)}#provenance)\n\n`)

    const packageLink = `[$(package)${SPACER}View on npmx.dev](${npmxPackageUrl(resolvedName)})`
    const docsLink = `[$(book)${SPACER}View docs on npmx.dev](${npmxDocsUrl(resolvedName, resolvedSpec)})`

    md.appendMarkdown(`${packageLink} | ${docsLink}`)

    return new Hover(md)
  }
}
