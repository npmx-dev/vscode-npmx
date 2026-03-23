import type { GetPackageManagerRequest } from '#shared/protocol'
import type { DocumentFilter } from '@volar/vscode'
import { displayName, extensionId } from '#shared/meta'
import { GET_PACKAGE_MANAGER_METHOD } from '#shared/protocol'
import { logger } from '#state'
import { SUPPORTED_DOCUMENT_PATTERN } from '#utils/constants'
import { middleware } from '@volar/vscode'
import { LanguageClient, TransportKind } from '@volar/vscode/node'
import { commands, Uri } from 'vscode'

const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'javascriptreact',
  'typescriptreact',
  'vue',
  'astro',
  'svelte',
  'mdx',
  'html',
] as const

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
        ...SUPPORTED_LANGUAGES.map((language) => ({ scheme: 'file', language } satisfies DocumentFilter)),
      ],
      markdown: {
        isTrusted: true,
        supportHtml: true,
      },
      outputChannel: logger.logger.value!,
    },
  )

  client.onRequest(
    GET_PACKAGE_MANAGER_METHOD,
    async (params: GetPackageManagerRequest.ParamsType): Promise<GetPackageManagerRequest.ResponseType> => {
      try {
        const result = await commands.executeCommand<GetPackageManagerRequest.ResponseType>('npm.packageManager', Uri.parse(params.uri))
        return result || 'npm'
      } catch {
        return 'npm'
      }
    },
  )

  return { client, ready: client.start() }
}
