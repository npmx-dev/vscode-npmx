import type { BaseLanguageClient } from '@volar/vscode'
import type { DecorationOptions } from 'vscode'
import { isPackageManifest } from 'npmx-language-core/utils'
import { useActiveTextEditor, useEditorDecorations, watch } from 'reactive-vscode'
import { Range } from 'vscode'
import { logger } from '#state'
import { offsetRangeToRange } from '#utils/ast'
import { getResolvedDependencies } from '#utils/request'

export function useDecorators(client: BaseLanguageClient) {
  const activeEditor = useActiveTextEditor()

  const { update } = useEditorDecorations(
    activeEditor,
    {
      after: { color: 'rgba(136, 136, 136, 0.63)' },
    },
    async (editor) => {
      const document = editor.document
      if (!isPackageManifest(document.uri.path))
        return []
      logger.info(`[decorators] updating ${document.uri.path}`)

      const dependencies = await getResolvedDependencies(client, document.uri)
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
              contentText: `\t\t ${dep.resolvedSpec}`,
            },
          },
        })
      }

      return result
    },
  )

  watch(activeEditor, update)
}
