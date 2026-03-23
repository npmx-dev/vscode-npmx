import type { OffsetRange } from '../types'

export interface ImportSpecifierHit {
  specifier: string
  packageName: string
}

const RELATIVE_IMPORT_PATTERN = /^\.{1,2}(?:\/|$)/
const ABSOLUTE_IMPORT_PATTERN = /^\//
const PROTOCOL_IMPORT_PATTERN = /^[a-z][a-z\d+.-]*:/i
const STATEMENT_SUFFIX_PATTERN = /^\s*(?:;.*)?$/
const CALL_SUFFIX_PATTERN = /^\s*\)/
const FROM_IMPORT_PREFIX_PATTERN = /(?:\b|\s+)from\s*(?:\n|$)/
const BARE_IMPORT_PREFIX_PATTERN = /(?:\b|\s+)import\s*(?:\n|$)/
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

export function getImportSpecifierInLine(text: string, range: OffsetRange): ImportSpecifierHit | undefined {
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

  const before = text.slice(0, leftQuoteIndex)
  const after = text.slice(rightQuoteIndex + 1)

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
