import { createLabsInfo } from '@volar/vscode'
import { ADD_TO_IGNORE_COMMAND, REPLACE_TEXT_COMMAND } from 'npmx-shared/commands'
import { commands, displayName, version } from 'npmx-shared/meta'
import { defineExtension, useCommands } from 'reactive-vscode'
import { Uri } from 'vscode'
import { launch } from './client'
import { addToIgnore } from './commands/add-to-ignore'
import { openFileInNpmx } from './commands/open-file-in-npmx'
import { openInBrowser } from './commands/open-in-browser'
import { replaceText } from './commands/replace-text'
import { useDecorators } from './providers/decorators'
import { logger } from './state'

export const { activate, deactivate } = defineExtension((ctx) => {
  const volarLabs = createLabsInfo()

  const serverPath = Uri.joinPath(ctx.extensionUri, './dist/server/index.cjs').fsPath
  const { client } = launch(serverPath)
  volarLabs.addLanguageClient(client)

  useDecorators(client)

  useCommands({
    [commands.openInBrowser]: openInBrowser,
    [commands.openFileInNpmx]: openFileInNpmx,
    [ADD_TO_IGNORE_COMMAND]: addToIgnore,
    [REPLACE_TEXT_COMMAND]: replaceText,
  })

  logger.info(`${displayName} Activated, v${version}`)
})
