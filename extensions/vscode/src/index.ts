import { useWorkspaceContext } from '#composables/workspace-context'
import { commands, displayName, version } from '#shared/meta'
import { createLabsInfo } from '@volar/vscode'
import { defineExtension, useCommands } from 'reactive-vscode'
import { Uri } from 'vscode'
import { launch } from './client'
import { openFileInNpmx } from './commands/open-file-in-npmx'
import { openInBrowser } from './commands/open-in-browser'
import { useCodeActions } from './providers/code-actions'
import { useCompletionItem } from './providers/completion-item'
import { useDecorators } from './providers/decorators'
import { useDiagnostics } from './providers/diagnostics'
import { useDocumentLink } from './providers/document-link'
import { logger } from './state'

export const { activate, deactivate } = defineExtension((ctx) => {
  const volarLabs = createLabsInfo()

  const serverPath = Uri.joinPath(ctx.extensionUri, './dist/server/bin/index.js').fsPath
  const { client } = launch(serverPath)
  volarLabs.addLanguageClient(client)

  useWorkspaceContext()

  useCompletionItem()
  useDiagnostics()
  useDecorators()
  useCodeActions()
  useDocumentLink()

  useCommands({
    [commands.openInBrowser]: openInBrowser,
    [commands.openFileInNpmx]: openFileInNpmx,
  })

  logger.info(`${displayName} Activated, v${version}`)
})
