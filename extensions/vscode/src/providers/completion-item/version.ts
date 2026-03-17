import type { CompletionItemProvider, Position, TextDocument } from 'vscode'
import { getResolvedDependencyByOffset } from '#core/workspace'
import { config } from '#state'
import { offsetRangeToRange } from '#utils/ast'
import { PRERELEASE_PATTERN } from '#utils/constants'
import { formatUpgradeVersion } from '#utils/version'
import { CompletionItem, CompletionItemKind } from 'vscode'

export class VersionCompletionItemProvider implements CompletionItemProvider {
  static triggers = [':', '^', '~', '.', ...Array.from({ length: 10 }).map((_, i) => `${i}`)]

  async provideCompletionItems(document: TextDocument, position: Position) {
    const offset = document.offsetAt(position)
    const info = await getResolvedDependencyByOffset(document.uri, offset)
    if (!info)
      return

    if (info.resolvedProtocol !== 'npm')
      return

    const pkg = await info.packageInfo()
    if (!pkg)
      return

    const items: CompletionItem[] = []

    for (const version in pkg.versionsMeta) {
      const meta = pkg.versionsMeta[version]!

      if (meta.deprecated != null)
        continue

      if (config.completion.excludePrerelease && PRERELEASE_PATTERN.test(version))
        continue

      if (config.completion.version === 'provenance-only' && !meta.provenance)
        continue

      const text = formatUpgradeVersion(info, version)
      const item = new CompletionItem(text, CompletionItemKind.Value)

      item.range = offsetRangeToRange(document, info.specRange)
      item.insertText = text

      const tag = pkg.versionToTag.get(version)
      if (tag)
        item.detail = tag

      items.push(item)
    }

    return items
  }
}
