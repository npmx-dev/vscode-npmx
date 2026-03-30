import type { Diagnostic, Range } from '@volar/language-service'
import type { OffsetRange } from 'npmx-language-core/types'

export function offsetRangeToRange(document: { positionAt: (offset: number) => Range['start'] }, [start, end]: OffsetRange): Range {
  return {
    start: document.positionAt(start),
    end: document.positionAt(end),
  }
}

export function getDiagnosticCodeValue(diagnostic: Diagnostic): string | undefined {
  if (typeof diagnostic.code === 'string')
    return diagnostic.code

  if (typeof diagnostic.code === 'number')
    return String(diagnostic.code)
}
