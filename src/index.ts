import { useWorkspaceContext } from '#composables/workspace-context'
import { defineExtension, useCommands } from 'reactive-vscode'
import { openFileInNpmx } from './commands/open-file-in-npmx'
import { openInBrowser } from './commands/open-in-browser'
import { commands, displayName, version } from './generated-meta'
import { useCodeActions } from './providers/code-actions'
import { useCompletionItem } from './providers/completion-item'
import { useDiagnostics } from './providers/diagnostics'
import { useDocumentLink } from './providers/document-link'
import { useHover } from './providers/hover'
import { logger } from './state'

export const { activate, deactivate } = defineExtension(() => {
  logger.info(`${displayName} Activated, v${version}`)

  useWorkspaceContext()

  useHover()
  useCompletionItem()
  useDiagnostics()
  useCodeActions()
  useDocumentLink()

  useCommands({
    [commands.openInBrowser]: openInBrowser,
    [commands.openFileInNpmx]: openFileInNpmx,
  })
})
