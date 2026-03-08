import { extractorEntries } from '#extractors'
import { config } from '#state'
import { watchEffect } from 'reactive-vscode'
import { Disposable, languages } from 'vscode'
import { NpmxDocumentLinkProvider } from './npmx'

export function useDocumentLink() {
  watchEffect((onCleanup) => {
    if (config.packageLinks === 'off')
      return

    const disposables = extractorEntries.map(({ pattern, extractor }) =>
      languages.registerDocumentLinkProvider({ pattern }, new NpmxDocumentLinkProvider(extractor)),
    )

    onCleanup(() => Disposable.from(...disposables).dispose())
  })
}
