import { displayName, extensionId } from '#shared/meta'
import { logger } from '#state'
import { SUPPORTED_DOCUMENT_PATTERN } from '#utils/constants'
import { middleware } from '@volar/vscode'
import { LanguageClient, TransportKind } from '@volar/vscode/node'

export function launch(serverPath: string) {
  const client = new LanguageClient(
    extensionId,
    displayName,
    {
      run: {
        module: serverPath,
        transport: TransportKind.ipc,
      },
      debug: {
        module: serverPath,
        transport: TransportKind.ipc,
        options: { execArgv: ['--nolazy', '--inspect=6009'] },
      },
    },
    {
      middleware,
      documentSelector: [
        { scheme: 'file', pattern: SUPPORTED_DOCUMENT_PATTERN },
      ],
      markdown: {
        isTrusted: true,
        supportHtml: true,
      },
      outputChannel: logger.logger.value!,
    },
  )

  client.start()
  client.info('[language-client] started')

  return client
}
