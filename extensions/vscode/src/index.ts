import { useWorkspaceContext } from '#composables/workspace-context'
import { ADD_TO_IGNORE_COMMAND } from '#shared/commands'
import { commands, displayName, version } from '#shared/meta'
import { createLabsInfo } from '@volar/vscode'
import { defineExtension, useCommand, useCommands } from 'reactive-vscode'
import { Uri } from 'vscode'
import { launch } from './client'
import { addToIgnore } from './commands/add-to-ignore'
import { openFileInNpmx } from './commands/open-file-in-npmx'
import { openInBrowser } from './commands/open-in-browser'
import { useDecorators } from './providers/decorators'
import { logger } from './state'

export const { activate, deactivate } = defineExtension((ctx) => {
  const volarLabs = createLabsInfo()

  const serverPath = Uri.joinPath(ctx.extensionUri, './dist/server/bin/index.js').fsPath
  const { client } = launch(serverPath)
  volarLabs.addLanguageClient(client)

  useWorkspaceContext()

  useDecorators()

  useCommand(ADD_TO_IGNORE_COMMAND, addToIgnore)

  useCommands({
    [commands.openInBrowser]: openInBrowser,
    [commands.openFileInNpmx]: openFileInNpmx,
  })

  logger.info(`${displayName} Activated, v${version}`)
})
