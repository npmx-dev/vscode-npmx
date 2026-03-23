import { createConnection, createServer, createSimpleProject } from '@volar/language-server/node'
import { createNpmxLanguageServicePlugins } from 'npmx-language-service'
import { name, version } from '../package.json' with { type: 'json' }
import { createWorkspaceState } from './workspace'

export function startServer() {
  const connection = createConnection()
  const server = createServer(connection)

  const workspaceState = createWorkspaceState(connection, server)

  connection.listen()

  connection.onInitialize((params) => ({
    serverInfo: {
      name,
      version,
    },
    ...server.initialize(
      params,
      createSimpleProject([]),
      createNpmxLanguageServicePlugins(workspaceState),
    ),
  }))
  connection.onInitialized(() => {
    connection.console.info('npmx language server initialized')

    server.initialized()
  })
  connection.onShutdown(server.shutdown)
}
