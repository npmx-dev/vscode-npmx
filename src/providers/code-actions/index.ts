import { extractorEntries } from '#extractors'
import { config } from '#state'
import { computed, watch } from 'reactive-vscode'
import { CodeActionKind, Disposable, languages } from 'vscode'
import { QuickFixProvider } from './quick-fix'

export function useCodeActions() {
  const hasQuickFix = computed(() => config.diagnostics.upgrade || config.diagnostics.vulnerability)

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
