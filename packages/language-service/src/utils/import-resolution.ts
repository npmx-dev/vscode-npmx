import { getImportSpecifierInLine } from 'npmx-language-core/utils'
import { getWordRangeAtOffset } from '../utils/text'

export interface ImportSpecifierContext {
  specifier: string
  packageName: string
}

export function extractImportSpecifier(text: string, offset: number): ImportSpecifierContext | undefined {
  const wordRange = getWordRangeAtOffset(text, offset)
  if (!wordRange)
    return

  const hit = getImportSpecifierInLine(text, wordRange)

  if (!hit)
    return

  return {
    specifier: hit.specifier,
    packageName: hit.packageName,
  }
}
