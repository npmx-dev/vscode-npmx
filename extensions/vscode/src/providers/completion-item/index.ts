import { PACKAGE_JSON_BASENAME, SUPPORTED_DOCUMENT_PATTERN } from '#shared/constants'
import { config } from '#state'
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
      { pattern: `**/${PACKAGE_JSON_BASENAME}` },
      new CatalogCompletionItemProvider(),
      ...CatalogCompletionItemProvider.triggers,
    )

    onCleanup(() => disposable.dispose())
  })
}
