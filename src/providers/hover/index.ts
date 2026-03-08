import { extractorEntries } from '#extractors'
import { config } from '#state'
import { watchEffect } from 'reactive-vscode'
import { Disposable, languages } from 'vscode'
import { NpmxHoverProvider } from './npmx'

export function useHover() {
  watchEffect((onCleanup) => {
    if (!config.hover.enabled)
      return

    const disposables = extractorEntries.map(({ pattern, extractor }) =>
      languages.registerHoverProvider({ pattern }, new NpmxHoverProvider(extractor)),
    )

    onCleanup(() => Disposable.from(...disposables).dispose())
  })
}
