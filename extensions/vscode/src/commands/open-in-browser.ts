import { NPMX_DEV } from '#shared/constants'
import { env, Uri } from 'vscode'

export function openInBrowser() {
  env.openExternal(Uri.parse(NPMX_DEV))
}
