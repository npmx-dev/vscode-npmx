import { config } from '#state'
import { SUPPORTED_DOCUMENT_PATTERN } from '#utils/constants'
import { watchEffect } from 'reactive-vscode'
import { languages } from 'vscode'
import { VersionCompletionItemProvider } from './version'

export function useCompletionItem() {
  watchEffect((onCleanup) => {
    if (config.completion.version === 'off')
      return

    const disposable = languages.registerCompletionItemProvider(
      { pattern: SUPPORTED_DOCUMENT_PATTERN },
      new VersionCompletionItemProvider(),
      ...VersionCompletionItemProvider.triggers,
    )

    onCleanup(() => disposable.dispose())
  })
}
