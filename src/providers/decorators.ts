import type { DecorationOptions } from 'vscode'
import { getResolvedDependencies } from '#core/workspace'
import { logger } from '#state'
import { offsetRangeToRange } from '#utils/ast'
import { isPackageManifestPath } from '#utils/file'
import { useActiveTextEditor, useEditorDecorations, watch } from 'reactive-vscode'
import { Range } from 'vscode'

export function useDecorators() {
  const activeEditor = useActiveTextEditor()

  const { update } = useEditorDecorations(
    activeEditor,
    {
      after: { color: 'rgba(136, 136, 136, 0.63)' },
    },
    async (editor) => {
      const document = editor.document
      if (!isPackageManifestPath(document.uri.path))
        return []
      logger.info(`[decorators] updating ${document.uri.path}`)

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

  watch(activeEditor, update)
}
