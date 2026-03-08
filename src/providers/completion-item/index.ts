import { SUPPORTED_DOCUMENT_PATTERN } from '#constants'
import { config } from '#state'
import { watchEffect } from 'reactive-vscode'
import { languages } from 'vscode'
import { VersionCompletionItemProvider } from './version'

export const VERSION_TRIGGER_CHARACTERS = [':', '^', '~', '.', ...Array.from({ length: 10 }).map((_, i) => `${i}`)]

export function useCompletionItem() {
  watchEffect((onCleanup) => {
    if (config.completion.version === 'off')
      return

    const disposable = languages.registerCompletionItemProvider(
      { pattern: SUPPORTED_DOCUMENT_PATTERN },
      new VersionCompletionItemProvider(),
      ...VERSION_TRIGGER_CHARACTERS,
    )

    onCleanup(() => disposable.dispose())
  })
}
