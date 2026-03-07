import type { CompletionItemProvider, Position, TextDocument } from 'vscode'
import { PRERELEASE_PATTERN } from '#constants'
import { config } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { offsetRangeToRange } from '#utils/ast'
import { formatUpgradeVersion, isSupportedProtocol } from '#utils/version'
import { getResolvedDependencyByOffset } from '#utils/workspace'
import { CompletionItem, CompletionItemKind } from 'vscode'

export class VersionCompletionItemProvider implements CompletionItemProvider {
  async provideCompletionItems(document: TextDocument, position: Position) {
    const offset = document.offsetAt(position)
    const info = await getResolvedDependencyByOffset(document.uri, offset)
    if (!info)
      return

    if (!isSupportedProtocol(info.protocol))
      return

    const pkg = await getPackageInfo(info.resolvedName)
    if (!pkg)
      return

    const items: CompletionItem[] = []

    for (const version in pkg.versionsMeta) {
      const meta = pkg.versionsMeta[version]

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
