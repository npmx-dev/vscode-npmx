import type { DecorationOptions } from 'vscode'
import { getResolvedDependencies } from '#core/workspace'
import { offsetRangeToRange } from '#utils/ast'
import { isSupportedDependencyDocument } from '#utils/file'
import { useActiveTextEditor, useEditorDecorations } from 'reactive-vscode'
import { Range } from 'vscode'

export function useDecorators() {
  const editor = useActiveTextEditor()
  useEditorDecorations(
    editor,
    {
      after: { color: 'rgba(136, 136, 136, 0.63)' },
    },
    async (editor) => {
      const document = editor.document
      if (!isSupportedDependencyDocument(document))
        return []

      const dependencies = await getResolvedDependencies(document.uri)
      if (!dependencies)
        return []

      const result: DecorationOptions[] = []

      for (const dep of dependencies) {
        if (dep.protocol !== 'catalog')
          continue

        const range = offsetRangeToRange(document, dep.specRange)
        const line = range.end.line
        const len = document.lineAt(line).text.length
        result.push({
          range: new Range(line, 0, line, len),
          renderOptions: {
            after: {
              contentText: `\t\t# ${dep.resolvedSpec}`,
            },
          },
        })
      }

      return result
    },
  )
}
