import type { ClientFeatures } from 'npmx-language-service/types'
import { createConnection, createServer, createSimpleProject } from '@volar/language-server/node'
import { createNpmxLanguageServicePlugins } from 'npmx-language-service'
import { name, version } from '../package.json' with { type: 'json' }
import { registerRequests } from './request'
import { createWorkspaceState, DEFAULT_CLIENT_FEATURES } from './workspace'

export function startServer() {
  const connection = createConnection()
  const server = createServer(connection)

  const workspaceState = createWorkspaceState(connection, server)

  connection.listen()

  connection.onInitialize((params) => {
    workspaceState.setClientFeatures(readClientFeatures(params.initializationOptions))

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

function readClientFeatures(value: unknown): ClientFeatures {
  if (typeof value !== 'object' || value === null)
    return DEFAULT_CLIENT_FEATURES

  if (!('npmx' in value))
    return DEFAULT_CLIENT_FEATURES

  const npmx = value.npmx
  if (typeof npmx !== 'object' || npmx === null || !('clientFeatures' in npmx))
    return DEFAULT_CLIENT_FEATURES

  const clientFeatures = npmx.clientFeatures
  if (typeof clientFeatures !== 'object' || clientFeatures === null)
    return DEFAULT_CLIENT_FEATURES

  return {
    catalogInlayHints: readBoolean(clientFeatures, 'catalogInlayHints', DEFAULT_CLIENT_FEATURES.catalogInlayHints),
    markdownIcons: readBoolean(clientFeatures, 'markdownIcons', DEFAULT_CLIENT_FEATURES.markdownIcons),
  }
}

function readBoolean(value: object, key: string, fallback: boolean): boolean {
  const candidate = Object.entries(value).find(([name]) => name === key)?.[1]
  return typeof candidate === 'boolean'
    ? candidate
    : fallback
}
