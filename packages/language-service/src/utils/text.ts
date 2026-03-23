import type { OffsetRange } from 'npmx-language-core/types'

const WORD_CHAR = /[\w-]/

export function getWordRangeAtOffset(text: string, offset: number): OffsetRange | undefined {
  const char = text[offset]
  if (!char || !WORD_CHAR.test(char))
    return

  let start = offset
  let end = offset + 1

  while (start > 0 && WORD_CHAR.test(text[start - 1]!))
    start--

  while (end < text.length && WORD_CHAR.test(text[end]!))
    end++

  return [start, end]
}
