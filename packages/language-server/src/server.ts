import type { ClientFeatures } from 'npmx-language-service/types'
import { createConnection, createServer, createSimpleProject } from '@volar/language-server/node'
import { createNpmxLanguageServicePlugins } from 'npmx-language-service'
import { DEFAULT_CLIENT_FEATURES } from 'npmx-language-service/types'
import { name, version } from '../package.json' with { type: 'json' }
import { registerRequests } from './request'
import { createWorkspaceState } from './workspace'

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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readClientFeatures(value: unknown): ClientFeatures {
  if (!isObject(value) || !isObject(value.npmx) || !isObject(value.npmx.clientFeatures))
    return DEFAULT_CLIENT_FEATURES

  const cf = value.npmx.clientFeatures
  return {
    catalogInlayHints: typeof cf.catalogInlayHints === 'boolean'
      ? cf.catalogInlayHints
      : DEFAULT_CLIENT_FEATURES.catalogInlayHints,
    iconStyle: cf.iconStyle === 'codicon' || cf.iconStyle === 'emoji'
      ? cf.iconStyle
      : DEFAULT_CLIENT_FEATURES.iconStyle,
  }
}
