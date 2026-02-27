import { extractorEntries } from '#extractors'
import { config } from '#state'
import { watchEffect } from 'reactive-vscode'
import { Disposable, languages } from 'vscode'
import { VersionCodeLensProvider } from './version'

export function useCodeLens() {
  watchEffect((onCleanup) => {
    if (!config.versionLens.enabled)
      return

    const disposables = extractorEntries.map(({ pattern, extractor }) =>
      languages.registerCodeLensProvider({ pattern }, new VersionCodeLensProvider(extractor)),
    )

    onCleanup(() => Disposable.from(...disposables).dispose())
  })
}
