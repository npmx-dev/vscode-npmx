import type { CompletionItemProvider, Position, TextDocument } from 'vscode'
import { findNodeAtOffset } from 'jsonc-parser'
import { CompletionItem, CompletionItemKind } from 'vscode'
import { getJsonAst } from '../utils/jsonAst'

async function fetchVersions(name: string) {
  return ['1.0.0', '2.0.0']
}

function resolvePackageName(name: string) {
  return ''
}

export class PackageJsonVersionCompletionProvider implements CompletionItemProvider {
  async provideCompletionItems(document: TextDocument, position: Position) {
    const offset = document.offsetAt(position)

    const root = getJsonAst(document)
    if (!root)
      return

    const node = findNodeAtOffset(root, offset)
    if (!node || node.type !== 'string')
      return

    const packageName = resolvePackageName(node.value)
    if (!packageName)
      return

    const versions = await fetchVersions(packageName)

    return versions.map((v) => {
      const item = new CompletionItem(v, CompletionItemKind.Value)

      item.insertText = `^${v}`
      item.detail = 'npm version'

      return item
    })
  }
}
