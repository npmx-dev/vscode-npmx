import { SUPPORTED_DOCUMENT_PATTERN } from '#constants'
import { config } from '#state'
import { watchEffect } from 'reactive-vscode'
import { languages } from 'vscode'
import { NpmxHoverProvider } from './npmx'

export function useHover() {
  watchEffect((onCleanup) => {
    if (!config.hover.enabled)
      return

    const disposable = languages.registerHoverProvider({ pattern: SUPPORTED_DOCUMENT_PATTERN }, new NpmxHoverProvider())

    onCleanup(() => disposable.dispose())
  })
}
