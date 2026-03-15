import type { HoverProvider, Position, TextDocument } from 'vscode'
import { getResolvedDependencyByOffset } from '#core/workspace'
import { SPACER } from '#shared/constants'
import { jsrPackageUrl, npmxDocsUrl, npmxPackageUrl } from '#utils/links'
import { Hover, MarkdownString } from 'vscode'

export class NpmxHoverProvider implements HoverProvider {
  async provideHover(document: TextDocument, position: Position) {
    const offset = document.offsetAt(position)
    const dep = await getResolvedDependencyByOffset(document.uri, offset)
    if (!dep)
      return

    const { resolvedName, resolvedSpec, resolvedProtocol, packageInfo } = dep

    switch (resolvedProtocol) {
      case 'jsr': {
        const jsrMd = new MarkdownString('', true)
        jsrMd.isTrusted = true

        const jsrPackageLink = `[$(package)${SPACER}View on jsr.io](${jsrPackageUrl(resolvedName)})`
        jsrMd.appendMarkdown(`${jsrPackageLink} | $(warning) Not on npmx`)
        return new Hover(jsrMd)
      }
      case 'npm': {
        const pkg = await packageInfo()
        if (!pkg) {
          const errorMd = new MarkdownString('', true)

          errorMd.isTrusted = true
          errorMd.appendMarkdown('$(warning) Unable to fetch package information')

          return new Hover(errorMd)
        }

        const md = new MarkdownString('', true)
        md.isTrusted = true

        const resolvedVersion = await dep.resolvedVersion()
        if (resolvedVersion && pkg.versionsMeta[resolvedVersion]?.provenance)
          // npmx.dev can resolve ranges and tags version specifier
          md.appendMarkdown(`[$(verified)${SPACER}Verified provenance](${npmxPackageUrl(resolvedName, resolvedSpec)}#provenance)\n\n`)

        const packageLink = `[$(package)${SPACER}View on npmx.dev](${npmxPackageUrl(resolvedName)})`
        // npmx.dev can resolve ranges and tags version specifier
        const docsLink = `[$(book)${SPACER}View docs on npmx.dev](${npmxDocsUrl(resolvedName, resolvedSpec)})`

        md.appendMarkdown(`${packageLink} | ${docsLink}`)

        return new Hover(md)
      }
    }
  }
}
