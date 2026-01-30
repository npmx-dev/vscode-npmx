import type { Node } from 'jsonc-parser'
import type { TextDocument } from 'vscode'
import { createHash } from 'node:crypto'
import { parseTree } from 'jsonc-parser'

const astCache = new Map<string, {
  hash: string
  root: Node | undefined
}>()

function getKey(doc: TextDocument) {
  return doc.uri.toString()
}

function computeHash(text: string) {
  return createHash('sha1').update(text).digest('hex')
}

export function getJsonAst(doc: TextDocument) {
  const uri = getKey(doc)
  const text = doc.getText()
  const hash = computeHash(text)

  if (!astCache.has(uri)) {
    astCache.set(uri, {
      hash,
      root: parseTree(text),
    })
  } else {
    const { hash: key } = astCache.get(uri)!

    if (key !== hash) {
      astCache.set(uri, {
        hash,
        root: parseTree(text),
      })
    }
  }

  return astCache.get(uri)!.root
}
