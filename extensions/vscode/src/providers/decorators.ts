import type { BaseLanguageClient } from '@volar/vscode'
import type { DecorationOptions, TextEditor } from 'vscode'
import { isPackageManifest } from 'npmx-language-core/utils'
import { configs } from 'npmx-shared/meta'
import { useActiveTextEditor, useDisposable, useEditorDecorations, useEvent, watch } from 'reactive-vscode'
import { Range, window, workspace } from 'vscode'
import { logger } from '#state'
import { offsetRangeToRange } from '#utils/ast'
import { getResolvedDependencies } from '#utils/request'
import { usesCatalogInlayHints } from './catalog-display'

export function useDecorators(client: BaseLanguageClient) {
  const activeEditor = useActiveTextEditor()

  const decorationType = useDisposable(window.createTextEditorDecorationType({
    after: { color: 'rgba(136, 136, 136, 0.63)' },
  }))
  const { update } = useEditorDecorations(activeEditor, decorationType, getDecorations)

  async function getDecorations(editor: TextEditor): Promise<DecorationOptions[]> {
    if (usesCatalogInlayHints())
      return []

    const document = editor.document
    if (!isPackageManifest(document.uri.path))
      return []
    logger.info(`[decorators] updating ${document.uri.path}`)

    const dependencies = await getResolvedDependencies(client, document.uri)
    if (!dependencies || usesCatalogInlayHints())
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
  }

  watch(activeEditor, update)
  useEvent(workspace.onDidChangeConfiguration, [async (event) => {
    if (!event.affectsConfiguration(configs.catalogDisplay.key))
      return

    await Promise.all(window.visibleTextEditors.map(async (editor) => {
      editor.setDecorations(decorationType, await getDecorations(editor))
    }))
  }])
}
