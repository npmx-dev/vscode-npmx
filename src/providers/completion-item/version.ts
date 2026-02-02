import type { Extractor } from '#types/extractor'
import type { CompletionItemProvider, Position, TextDocument } from 'vscode'
import { config } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { extractVersionPrefix } from '#utils/package'
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

    const pkg = await getPackageInfo(name)

    const prefix = extractVersionPrefix(version)

    const items: CompletionItem[] = []

    for (const version in pkg.versionsMeta) {
      const meta = pkg.versionsMeta[version]

      if (config.completion.version === 'provenance-only' && !meta.provenance)
        continue

      const text = `${prefix}${version}`
      const item = new CompletionItem(text, CompletionItemKind.Value)

      item.range = this.extractor.getNodeRange(document, versionNode)
      item.insertText = text

      const tag = pkg.versionToTag.get(version)
      if (tag)
        item.detail = tag

      items.push(item)
    }

    return items
  }
}
