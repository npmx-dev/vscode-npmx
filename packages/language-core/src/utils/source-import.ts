import type { OffsetRange } from '../types'

export interface ImportSpecifierHit {
  specifier: string
  packageName: string
}

const WORD_CHAR = /[@/\w.-]/
const RELATIVE_IMPORT_PATTERN = /^\.{1,2}(?:\/|$)/
const ABSOLUTE_IMPORT_PATTERN = /^\//
const PROTOCOL_IMPORT_PATTERN = /^[a-z][a-z\d+.-]*:/i
const STATEMENT_SUFFIX_PATTERN = /^[ \t]*(?:;[^\r\n]*)?(?:\r?\n|$)/
const CALL_SUFFIX_PATTERN = /^\s*\)/
const FROM_IMPORT_PREFIX_PATTERN = /(?:\b|\s+)from\s+/
const BARE_IMPORT_PREFIX_PATTERN = /(?:\b|\s+)import\s+/
const DYNAMIC_IMPORT_PREFIX_PATTERN = /(?:\b|\{|\s+)import\s*\(\s*$/
const REQUIRE_PREFIX_PATTERN = /(?:\b|\s+)require\s*\(\s*$/

function parsePackageName(specifier: string): string | undefined {
  if (
    RELATIVE_IMPORT_PATTERN.test(specifier)
    || ABSOLUTE_IMPORT_PATTERN.test(specifier)
    || PROTOCOL_IMPORT_PATTERN.test(specifier)
  ) {
    return
  }

  if (specifier.startsWith('@')) {
    const segments = specifier.split('/')
    if (segments.length < 2)
      return

    return `${segments[0]}/${segments[1]}`
  }

  const [packageName] = specifier.split('/')
  return packageName || undefined
}

function findQuote(text: string, start: number, step: -1 | 1): number {
  for (let index = start; index >= 0 && index < text.length; index += step) {
    const char = text[index]
    if (char === '\'' || char === '"')
      return index
  }

  return -1
}

function findStatementStart(text: string, offset: number): number {
  let pos = offset
  while (pos > 0) {
    const lineStart = text.lastIndexOf('\n', pos - 1)
    if (lineStart === -1)
      return 0

    const lineStartPos = lineStart + 1
    let firstChar = text[lineStartPos]

    if (firstChar === '\r' && text[lineStartPos + 1] === '\n')
      firstChar = text[lineStartPos + 2]

    if (firstChar !== undefined && firstChar !== ' ' && firstChar !== '\t' && firstChar !== '\n' && firstChar !== '\r')
      return lineStartPos

    pos = lineStart
  }
  return 0
}

function findStatementEnd(text: string, offset: number): number {
  for (let i = offset; i < text.length; i++) {
    const char = text[i]
    if (char === ';' || char === '\n') {
      const next = text[i + 1]
      if (next === undefined || next === '\n' || next === '\r')
        return i + 1
      if (char === ';')
        return i + 1
    }
    if (char === '\r') {
      const next = text[i + 1]
      if (next === '\n')
        return i + 2
      if (next === undefined || next === '\r')
        return i + 1
    }
    if (char === ')')
      return i + 1
  }
  return text.length
}

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

export function getImportSpecifier(text: string, range: OffsetRange): ImportSpecifierHit | undefined {
  const [start, end] = range
  const leftQuoteIndex = findQuote(text, start - 1, -1)
  if (leftQuoteIndex === -1)
    return

  const rightQuoteIndex = findQuote(text, end, 1)
  if (rightQuoteIndex === -1 || text[leftQuoteIndex] !== text[rightQuoteIndex])
    return

  const specifier = text.slice(leftQuoteIndex + 1, rightQuoteIndex)
  const packageName = parsePackageName(specifier)
  if (!packageName)
    return

  const statementStart = findStatementStart(text, leftQuoteIndex)
  const statementEnd = findStatementEnd(text, rightQuoteIndex + 1)
  const before = text.slice(statementStart, leftQuoteIndex)
  const after = text.slice(rightQuoteIndex + 1, statementEnd)

  const isModule
    = (FROM_IMPORT_PREFIX_PATTERN.test(before) && STATEMENT_SUFFIX_PATTERN.test(after))
      || (BARE_IMPORT_PREFIX_PATTERN.test(before) && STATEMENT_SUFFIX_PATTERN.test(after))
      || (DYNAMIC_IMPORT_PREFIX_PATTERN.test(before) && CALL_SUFFIX_PATTERN.test(after))
      || (REQUIRE_PREFIX_PATTERN.test(before) && CALL_SUFFIX_PATTERN.test(after))

  if (!isModule)
    return

  return {
    specifier,
    packageName,
  }
}

export function getImportSpecifierAtOffset(text: string, offset: number): ImportSpecifierHit | undefined {
  const wordRange = getWordRangeAtOffset(text, offset)
  if (!wordRange)
    return

  return getImportSpecifier(text, wordRange)
}
