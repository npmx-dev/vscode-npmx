import type { ValidNode } from '#types/extractor'
import type { TextDocument } from 'vscode'
import { createHash } from 'node:crypto'
import { memoize } from './memoize'

function computeHash(text: string) {
  return createHash('sha1').update(text).digest('hex')
}

export function createCachedParse<T extends ValidNode>(
  parse: (text: string) => T | null,
) {
  return memoize(
    (doc: TextDocument) => parse(doc.getText()),
    { getKey: (doc) => `${doc.uri}:${computeHash(doc.getText())}` },
  )
}
