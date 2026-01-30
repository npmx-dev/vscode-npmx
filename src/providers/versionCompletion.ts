import type { CompletionItemProvider, Position, TextDocument } from 'vscode'
import { findNodeAtOffset } from 'jsonc-parser'
import { CompletionItem, CompletionItemKind } from 'vscode'
import { getJsonAst, getNodeRange, isInDepSection } from '../utils/jsonAst'
import { getPackageInfo } from '../utils/npm'

function isVersionPrefix(c: string) {
  return c === '^' || c === '~'
}

function getPrefix(v: string) {
  const firstChar = v[0]
  const valid = isVersionPrefix(firstChar)

  return valid ? firstChar : ''
}

export class PackageJsonVersionCompletionProvider implements CompletionItemProvider {
  async provideCompletionItems(document: TextDocument, position: Position) {
    const offset = document.offsetAt(position)

    const root = getJsonAst(document)
    if (!root)
      return

    const node = findNodeAtOffset(root, offset)
    if (!node || node.type !== 'string' || !isInDepSection(root, node))
      return

    const name = node.parent!.children![0].value as string
    const pkg = await getPackageInfo(name)

    const version = node.value as string
    const prefix = getPrefix(version)

    return Object.values(pkg.versions).map(({ version, tag }) => {
      const text = `${prefix}${version}`
      const item = new CompletionItem(text, CompletionItemKind.Value)

      item.range = getNodeRange(document, node)
      item.insertText = text
      if (tag)
        item.detail = tag

      return item
    })
  }
}
