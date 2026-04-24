import type { IWorkspaceState } from 'npmx-language-service/types'
import { createConnection, createServer, createSimpleProject } from '@volar/language-server/node'
import { createNpmxLanguageServicePlugins } from 'npmx-language-service'
import { name, version } from '../package.json' with { type: 'json' }
import { registerRequests } from './request'
import { createWorkspaceState } from './workspace'

type EditorFlavor = ReturnType<IWorkspaceState['getEditorFlavor']>

export function startServer() {
  const connection = createConnection()
  const server = createServer(connection)

  const workspaceState = createWorkspaceState(connection, server)

  connection.listen()

  connection.onInitialize((params) => {
    workspaceState.setEditorFlavor(detectEditorFlavor(params))

    return {
      serverInfo: {
        name,
        version,
      },
      ...server.initialize(
        params,
        createSimpleProject([]),
        createNpmxLanguageServicePlugins(workspaceState),
      ),
    }
  })
  connection.onInitialized(() => {
    connection.console.info('npmx language server initialized')

    server.initialized()
  })
  connection.onShutdown(server.shutdown)

  registerRequests(connection, workspaceState)
}

function detectEditorFlavor(params: {
  clientInfo?: { name?: string }
  initializationOptions?: unknown
}): EditorFlavor {
  const editor = readEditorFromInitializationOptions(params.initializationOptions)
  if (editor)
    return editor

  const clientName = params.clientInfo?.name?.toLowerCase()
  if (clientName?.includes('zed'))
    return 'zed'
  if (clientName?.includes('visual studio code') || clientName?.includes('vscode'))
    return 'vscode'

  return 'unknown'
}

function readEditorFromInitializationOptions(value: unknown): EditorFlavor | undefined {
  if (typeof value !== 'object' || value === null)
    return

  if (!('npmx' in value))
    return

  const npmx = value.npmx
  if (typeof npmx !== 'object' || npmx === null || !('editor' in npmx))
    return

  const editor = npmx.editor
  return editor === 'vscode' || editor === 'zed'
    ? editor
    : undefined
}
