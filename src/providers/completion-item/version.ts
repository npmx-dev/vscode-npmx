import type { Extractor } from '#types/extractor'
import type { CompletionItemProvider, Position, TextDocument } from 'vscode'
import { PRERELEASE_PATTERN } from '#constants'
import { config } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { resolvePackage } from '#utils/package'
import { formatVersion, isSupportedProtocol } from '#utils/version'
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

    const result = await resolvePackage(document.uri, info)
    if (!result)
      return

    const { name, versionNode } = info
    const { protocol } = result

    if (!isSupportedProtocol(protocol))
      return

    const pkg = await getPackageInfo(name)
    if (!pkg)
      return

    const items: CompletionItem[] = []

    for (const semver in pkg.versionsMeta) {
      const meta = pkg.versionsMeta[semver]

      if (meta.deprecated != null)
        continue

      if (config.completion.excludePrerelease && PRERELEASE_PATTERN.test(semver))
        continue

      if (config.completion.version === 'provenance-only' && !meta.provenance)
        continue

      const text = formatVersion({ ...result, semver })
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
