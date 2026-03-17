import { config } from '#state'
import { SUPPORTED_DOCUMENT_PATTERN } from '#utils/constants'
import { watchEffect } from 'reactive-vscode'
import { languages } from 'vscode'
import { NpmxDocumentLinkProvider } from './npmx'

export function useDocumentLink() {
  watchEffect((onCleanup) => {
    if (config.packageLinks === 'off')
      return

    const disposable = languages.registerDocumentLinkProvider({ pattern: SUPPORTED_DOCUMENT_PATTERN }, new NpmxDocumentLinkProvider())

    onCleanup(() => disposable.dispose())
  })
}
