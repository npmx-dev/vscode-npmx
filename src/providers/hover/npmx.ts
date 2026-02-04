import type { Extractor } from '#types/extractor'
import type { HoverProvider, Position, TextDocument } from 'vscode'
import { SPACER } from '#constants'
import { getPackageInfo } from '#utils/api/package'
import { npmPacakgeUrl, npmxDocsUrl, npmxPackageUrl } from '#utils/links'
import { extractVersion } from '#utils/package'
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

    const { name, version } = dep
    const coercedVersion = extractVersion(version)
    const md = new MarkdownString('', true)
    md.isTrusted = true

    const pkg = await getPackageInfo(name)
    if (!pkg)
      return

    const currentVersion = pkg.versionsMeta[coercedVersion]
    if (currentVersion) {
      if (currentVersion.provenance)
        md.appendMarkdown(`[$(verified)${SPACER}Verified provenance](${npmPacakgeUrl(name, coercedVersion)}#provenance)\n\n`)
    }

    const packageLink = `[$(package)${SPACER}View on npmx](${npmxPackageUrl(name)})`
    const docsLink = `[$(book)${SPACER}View docs on npmx](${npmxDocsUrl(name, coercedVersion)})`

    md.appendMarkdown(`${packageLink} | ${docsLink}`)

    return new Hover(md)
  }
}
