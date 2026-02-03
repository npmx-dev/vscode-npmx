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
    if (!pkg)
      return

    const prefix = extractVersionPrefix(version)

    let versionsKV = Object.values(pkg.versions)

    if (config.completion.version === 'provenance-only')
      versionsKV = versionsKV.filter(({ hasProvenance }) => hasProvenance)

    return versionsKV.map(({ version, tag }) => {
      const text = `${prefix}${version}`
      const item = new CompletionItem(text, CompletionItemKind.Value)

      item.range = this.extractor.getNodeRange(document, versionNode)
      item.insertText = text
      if (tag)
        item.detail = tag

      return item
    })
  }
}
