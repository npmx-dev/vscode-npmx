import { createConnection, createServer, createSimpleProject } from '@volar/language-server/node'
import { createNpmxLanguageServicePlugins } from 'npmx-language-service'
import { name, version } from '../package.json' with { type: 'json' }

export function startServer() {
  const connection = createConnection()
  const server = createServer(connection)

  connection.listen()

  connection.onInitialize((params) => ({
    serverInfo: {
      name,
      version,
    },
    ...server.initialize(
      params,
      createSimpleProject([]),
      createNpmxLanguageServicePlugins(),
    ),
  }))
  connection.onInitialized(() => {
    connection.console.info('npmx language server initialized')

    server.initialized()
  })
  connection.onShutdown(server.shutdown)
}
