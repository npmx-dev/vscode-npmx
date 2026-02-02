import type { Extractor } from '#types/extractor'
import type { HoverProvider, Position, TextDocument } from 'vscode'
import { getPackageInfo } from '#utils/api/package'
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
    const currentVersion = pkg.versionsMeta[coercedVersion]
    if (currentVersion) {
      if (currentVersion.provenance)
        md.appendMarkdown(`[$(verified) Verified provenance](https://www.npmjs.com/package/${name}/v/${version}#provenance)\n\n`)
    }

    const footer = [
      `**[View on npmx](https://npmx.dev/package/${name})**`,
      `**[View docs on npmx](https://npmx.dev/docs/${name}/v/${coercedVersion})**`,
    ]

    md.appendMarkdown(`${footer.join(' | ')}\n`)

    return new Hover(md)
  }
}
