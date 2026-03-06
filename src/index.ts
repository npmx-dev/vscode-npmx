import { VERSION_TRIGGER_CHARACTERS } from '#constants'
import { defineExtension, useCommands, watchEffect } from 'reactive-vscode'
import { Disposable, languages } from 'vscode'
import { openFileInNpmx } from './commands/open-file-in-npmx'
import { openInBrowser } from './commands/open-in-browser'
import { extractorEntries } from './extractors'
import { commands, displayName, version } from './generated-meta'
import { useCodeActions } from './providers/code-actions'
import { VersionCompletionItemProvider } from './providers/completion-item/version'
import { useDiagnostics } from './providers/diagnostics'
import { NpmxDocumentLinkProvider } from './providers/document-link/npmx'
import { NpmxHoverProvider } from './providers/hover/npmx'
import { config, logger } from './state'

export const { activate, deactivate } = defineExtension(() => {
  logger.info(`${displayName} Activated, v${version}`)

  watchEffect((onCleanup) => {
    if (!config.hover.enabled)
      return

    const disposables = extractorEntries.map(({ pattern, extractor }) =>
      languages.registerHoverProvider({ pattern }, new NpmxHoverProvider(extractor)),
    )

    onCleanup(() => Disposable.from(...disposables).dispose())
  })

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

  watchEffect((onCleanup) => {
    if (config.packageLinks === 'off')
      return

    const disposables = extractorEntries.map(({ pattern, extractor }) =>
      languages.registerDocumentLinkProvider({ pattern }, new NpmxDocumentLinkProvider(extractor)),
    )

    onCleanup(() => Disposable.from(...disposables).dispose())
  })

  useDiagnostics()

  useCodeActions()

  useCommands({
    [commands.openInBrowser]: openInBrowser,
    [commands.openFileInNpmx]: openFileInNpmx,
  })
})
