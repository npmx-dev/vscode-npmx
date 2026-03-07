import type { ValidNode } from '#types/extractor'
import type { OffsetRange } from '#types/range'
import type { TextDocument } from 'vscode'
import { Range } from 'vscode'

export function isInRange(offset: number, [start, end]: [number, number, ...any]): boolean {
  return offset >= start && offset <= end
}

export function getNodeOffsetRange(node: ValidNode): OffsetRange {
  if ('offset' in node && 'length' in node)
    return [node.offset + 1, node.offset + node.length - 1]

  const [start, end] = node.range!
  return [start, end]
}

export function isOffsetInRange(offset: number, [start, end]: OffsetRange): boolean {
  return offset >= start && offset < end
}

export function offsetRangeToRange(document: TextDocument, [start, end]: OffsetRange): Range {
  return new Range(
    document.positionAt(start),
    document.positionAt(end),
  )
}
