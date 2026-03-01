import type { ConfigurationTarget } from 'vscode'
import { extractorEntries } from '#extractors'
import { config } from '#state'
import { computed, useCommand, watch } from 'reactive-vscode'
import { CodeActionKind, Disposable, languages, workspace } from 'vscode'
import { scopedConfigs } from '../../generated-meta'
import { QuickFixProvider } from './quick-fix'

export function useCodeActions() {
  useCommand('npmx.addToIgnore', async (scope: string, name: string, target: ConfigurationTarget) => {
    scope = `ignore.${scope}`
    const config = workspace.getConfiguration(scopedConfigs.scope)
    const current = config.get<string[]>(scope, [])
    if (current.includes(name))
      return
    await config.update(scope, [...current, name], target)
  })

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
