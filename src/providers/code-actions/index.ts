import { extractorEntries } from '#extractors'
import { config, internalCommands } from '#state'
import { computed, useCommand, watch } from 'reactive-vscode'
import { CodeActionKind, Disposable, languages } from 'vscode'
import { addToIgnore } from '../../commands/add-to-ignore'
import { QuickFixProvider } from './quick-fix'

export function useCodeActions() {
  useCommand(internalCommands.addToIgnore, addToIgnore)

  const hasQuickFix = computed(() => config.diagnostics.upgrade || config.diagnostics.deprecation || config.diagnostics.replacement || config.diagnostics.vulnerability)

  watch(hasQuickFix, (enabled, _, onCleanup) => {
    if (!enabled)
      return

    const provider = new QuickFixProvider()
    const options = { providedCodeActionKinds: [CodeActionKind.QuickFix] }
    const disposables = extractorEntries.map(({ pattern }) =>
      languages.registerCodeActionsProvider({ pattern }, provider, options),
    )

    onCleanup(() => Disposable.from(...disposables).dispose())
  }, { immediate: true })
}
