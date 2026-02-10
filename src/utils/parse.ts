import type { ValidNode } from '#types/extractor'
import type { TextDocument } from 'vscode'
import { memoize } from './memoize'

export function createCachedParse<T extends ValidNode>(
  parse: (text: string) => T | null,
) {
  return memoize(
    (doc: TextDocument) => parse(doc.getText()),
    { getKey: (doc) => `${doc.uri}:${doc.version}` },
  )
}
