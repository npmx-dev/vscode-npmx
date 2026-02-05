import type { Extractor } from '#types/extractor'
import type { CompletionItemProvider, Position, TextDocument } from 'vscode'
import { config } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { formatVersion, isSupportedProtocol, parseVersion } from '#utils/package'
import { CompletionItem, CompletionItemKind } from 'vscode'

export class VersionCompletionItemProvider<T extends Extractor> implements CompletionItemProvider {
  extractor: T

  constructor(extractor: T) {
    this.extractor = extractor
  }

  async provideCompletionItems(document: TextDocument, position: Position) {
    const root = this.extractor.parse(document)
    if (!root)
      return

    const offset = document.offsetAt(position)
    const info = this.extractor.getDependencyInfoByOffset(root, offset)
    if (!info)
      return

    const {
      versionNode,
      name,
      version,
    } = info

    const parsed = parseVersion(version)
    if (!parsed || !isSupportedProtocol(parsed.protocol))
      return

    const pkg = await getPackageInfo(name)
    if (!pkg)
      return

    const items: CompletionItem[] = []

    for (const semver in pkg.versionsMeta) {
      const meta = pkg.versionsMeta[semver]

      if (config.completion.version === 'provenance-only' && !meta.provenance)
        continue

      const text = formatVersion({ ...parsed, semver })
      const item = new CompletionItem(text, CompletionItemKind.Value)

      item.range = this.extractor.getNodeRange(document, versionNode)
      item.insertText = text

      const tag = pkg.versionToTag.get(semver)
      if (tag)
        item.detail = tag

      items.push(item)
    }

    return items
  }
}
