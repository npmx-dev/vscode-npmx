import type { Extractor } from '#types/extractor'
import { computed, useActiveTextEditor } from 'reactive-vscode'
import { languages } from 'vscode'
import { extractorEntries } from '../extractors'

export function useActiveExtractor() {
  const activeEditor = useActiveTextEditor()

  return computed<Extractor | undefined>(() => {
    const document = activeEditor.value?.document
    if (!document)
      return
    return extractorEntries.find(({ pattern }) => languages.match({ pattern }, document))?.extractor
  })
}
