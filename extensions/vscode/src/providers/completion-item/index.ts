import { config } from '#state'
import { PACKAGE_JSON_PATTERN, SUPPORTED_DOCUMENT_PATTERN } from '#utils/constants'
import { watchEffect } from 'reactive-vscode'
import { languages } from 'vscode'
import { CatalogCompletionItemProvider } from './catalog'
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

  watchEffect((onCleanup) => {
    const disposable = languages.registerCompletionItemProvider(
      { pattern: PACKAGE_JSON_PATTERN },
      new CatalogCompletionItemProvider(),
      ...CatalogCompletionItemProvider.triggers,
    )

    onCleanup(() => disposable.dispose())
  })
}
