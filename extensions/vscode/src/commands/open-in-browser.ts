import { NPMX_DEV } from 'npmx-language-core/constants'
import { env, Uri } from 'vscode'

export function openInBrowser() {
  env.openExternal(Uri.parse(NPMX_DEV))
}
