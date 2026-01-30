import type { Node } from 'jsonc-parser'
import type { TextDocument } from 'vscode'
import { createHash } from 'node:crypto'
import { findNodeAtLocation, parseTree } from 'jsonc-parser'
import { Range } from 'vscode'
import { logger } from '../state'
import { DEP_SECTIONS } from './constants'

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
    logger.info(`${uri}: can not find the cache`)
    astCache.set(uri, {
      hash,
      root: parseTree(text),
    })
  } else {
    const { hash: key } = astCache.get(uri)!

    if (key !== hash) {
      logger.info(`${uri}: cache is outdated`)
      astCache.set(uri, {
        hash,
        root: parseTree(text),
      })
    }
  }

  return astCache.get(uri)!.root
}

export function getNodeRange(doc: TextDocument, node: Node) {
  const start = doc.positionAt(node.offset + 1)
  const end = doc.positionAt(
    node.offset + node.length - 1,
  )

  return new Range(start, end)
}

export function isInDepSection(root: Node, node: Node) {
  return DEP_SECTIONS.some((section) => {
    const dep = findNodeAtLocation(root, [section])
    if (!dep || !dep.parent)
      return false

    const { offset, length } = dep.parent.children![1]

    return node.offset > offset && node.offset < offset + length
  })
}
