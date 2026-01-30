import { defineExtension } from 'reactive-vscode'
import { displayName, version } from './generated-meta'
import { registerJsonCompletionItemProvider } from './providers/completion-item/json'
import { registerJsonDocumentLinkProvider } from './providers/document-link/json'
import { logger } from './state'

export const { activate, deactivate } = defineExtension((ctx) => {
  logger.info(`${displayName} Activated, v${version}`)

  ctx.subscriptions.push(
    registerJsonDocumentLinkProvider(),
    registerJsonCompletionItemProvider(),
  )
})
