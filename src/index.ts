import { useWorkspaceContext } from '#composables/workspace-context'
import { SUPPORTED_DOCUMENT_PATTERN, VERSION_TRIGGER_CHARACTERS } from '#constants'
import { defineExtension, useCommands, watchEffect } from 'reactive-vscode'
import { languages } from 'vscode'
import { openFileInNpmx } from './commands/open-file-in-npmx'
import { openInBrowser } from './commands/open-in-browser'
import { commands, displayName, version } from './generated-meta'
import { useCodeActions } from './providers/code-actions'
import { VersionCompletionItemProvider } from './providers/completion-item/version'
import { useDiagnostics } from './providers/diagnostics'
import { NpmxDocumentLinkProvider } from './providers/document-link/npmx'
import { NpmxHoverProvider } from './providers/hover/npmx'
import { config, logger } from './state'

const documentFilter = { pattern: SUPPORTED_DOCUMENT_PATTERN }

export const { activate, deactivate } = defineExtension(() => {
  logger.info(`${displayName} Activated, v${version}`)

  watchEffect((onCleanup) => {
    if (!config.hover.enabled)
      return

    const disposable = languages.registerHoverProvider(documentFilter, new NpmxHoverProvider())

    onCleanup(() => disposable.dispose())
  })

  watchEffect((onCleanup) => {
    if (config.completion.version === 'off')
      return

    const disposable = languages.registerCompletionItemProvider(
      documentFilter,
      new VersionCompletionItemProvider(),
      ...VERSION_TRIGGER_CHARACTERS,
    )

    onCleanup(() => disposable.dispose())
  })

  watchEffect((onCleanup) => {
    if (config.packageLinks === 'off')
      return

    const disposable = languages.registerDocumentLinkProvider(documentFilter, new NpmxDocumentLinkProvider())

    onCleanup(() => disposable.dispose())
  })

  useWorkspaceContext()

  useDiagnostics()

  useCodeActions()

  useCommands({
    [commands.openInBrowser]: openInBrowser,
    [commands.openFileInNpmx]: openFileInNpmx,
  })
})
