import type { CompletionItemProvider, Position, Range, TextDocument } from 'vscode'
import { config } from '#state'
import { getPackageInfo } from '#utils/npm'
import { CompletionItem, CompletionItemKind } from 'vscode'

function isVersionPrefix(c: string) {
  return c === '^' || c === '~'
}

function getPrefix(v: string) {
  const firstChar = v[0]
  const valid = isVersionPrefix(firstChar)

  return valid ? firstChar : ''
}

export const triggerChars = ['.', '^', '~', ...Array.from({ length: 10 }).map((_, i) => `${i}`)]

export abstract class BaseCompletionItemProvider<T> implements CompletionItemProvider {
  abstract getDepInfo(document: TextDocument, position: Position): { node: T, name: string, version: string } | undefined
  abstract getReplacingRange(document: TextDocument, node: T): Range

  async provideCompletionItems(document: TextDocument, position: Position) {
    const info = this.getDepInfo(document, position)
    if (!info)
      return

    const {
      node,
      name,
      version,
    } = info

    const pkg = await getPackageInfo(name)

    const prefix = getPrefix(version)

    let versionsKV = Object.values(pkg.versions)

    if (config.versionCompletion === 'provenance-only')
      versionsKV = versionsKV.filter(({ hasProvenance }) => hasProvenance)

    return versionsKV.map(({ version, tag }) => {
      const text = `${prefix}${version}`
      const item = new CompletionItem(text, CompletionItemKind.Value)

      item.range = this.getReplacingRange(document, node)
      item.insertText = text
      if (tag)
        item.detail = tag

      return item
    })
  }
}
