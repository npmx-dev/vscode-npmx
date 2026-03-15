import { SUPPORTED_DOCUMENT_PATTERN } from '#shared/constants'
import { config, internalCommands } from '#state'
import { computed, useCommand, watch } from 'reactive-vscode'
import { CodeActionKind, languages } from 'vscode'
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
    const disposable = languages.registerCodeActionsProvider({ pattern: SUPPORTED_DOCUMENT_PATTERN }, provider, options)

    onCleanup(() => disposable.dispose())
  }, { immediate: true })
}
