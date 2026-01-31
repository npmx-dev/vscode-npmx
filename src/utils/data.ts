import type { Extractor } from '#types/extractor'
import type { TextDocument } from 'vscode'
import { createHash } from 'node:crypto'
import { logger } from '#state'

// Share the cache with each file processed by its specific parser.
const astCache = new Map<string, {
  hash: string
  root: any | undefined
}>()

function getKey(doc: TextDocument) {
  return doc.uri.toString()
}

function computeHash(text: string) {
  return createHash('sha1').update(text).digest('hex')
}

export function createCachedParse<T>(
  parse: (text: string) => ReturnType<Extractor<T>['parse']>,
): Extractor<T>['parse'] {
  return function (doc: TextDocument) {
    const uri = getKey(doc)
    const text = doc.getText()
    const hash = computeHash(text)

    if (!astCache.has(uri)) {
      logger.info(`${uri}: can not find the cache`)
      astCache.set(uri, {
        hash,
        root: parse(text),
      })
    } else {
      const { hash: key } = astCache.get(uri)!

      if (key !== hash) {
        logger.info(`${uri}: cache is outdated`)
        astCache.set(uri, {
          hash,
          root: parse(text),
        })
      }
    }

    return astCache.get(uri)!.root
  }
}
