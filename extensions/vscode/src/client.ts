import type { DocumentFilter } from '@volar/vscode'
import { SUPPORTED_DOCUMENT_PATTERN } from '#utils/constants'
import { middleware } from '@volar/vscode'
import { LanguageClient, TransportKind } from '@volar/vscode/node'
import { displayName, extensionId } from 'npmx-shared/meta'
import { Hover, MarkdownString } from 'vscode'
import { registerRequests } from './request'

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

function transformMarkdownString(md: string) {
  return new MarkdownString(md, true)
}

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
      middleware: {
        ...middleware,
        provideHover: async (document, position, token, next) => {
          const hover = await next(document, position, token)
          if (!hover)
            return

          const contents = hover.contents.map((c) => {
            if (typeof c === 'string')
              return transformMarkdownString(c)
            if ('value' in c)
              return transformMarkdownString(c.value)

            return c
          })

          return new Hover(contents, hover.range)
        },
      },
      documentSelector: [
        { scheme: 'file', pattern: SUPPORTED_DOCUMENT_PATTERN },
        ...SUPPORTED_LANGUAGES.map((language) => ({ scheme: 'file', language } satisfies DocumentFilter)),
      ],
      markdown: {
        isTrusted: true,
        supportHtml: true,
      },
      synchronize: {
        configurationSection: [displayName],
      },
      diagnosticCollectionName: displayName,
      outputChannelName: `${displayName} Language Server`,
    },
  )

  registerRequests(client)

  return { client, ready: client.start() }
}
