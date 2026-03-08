import { VERSION_TRIGGER_CHARACTERS } from '#constants'
import { extractorEntries } from '#extractors'
import { config } from '#state'
import { watchEffect } from 'reactive-vscode'
import { Disposable, languages } from 'vscode'
import { VersionCompletionItemProvider } from './version'

export function useCompletionItem() {
  watchEffect((onCleanup) => {
    if (config.completion.version === 'off')
      return

    const disposables = extractorEntries.map(({ pattern, extractor }) =>
      languages.registerCompletionItemProvider(
        { pattern },
        new VersionCompletionItemProvider(extractor),
        ...VERSION_TRIGGER_CHARACTERS,
      ),
    )

    onCleanup(() => Disposable.from(...disposables).dispose())
  })
}
