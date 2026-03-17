import { NPMX_DEV } from '#utils/constants'
import { env, Uri } from 'vscode'

export function openInBrowser() {
  env.openExternal(Uri.parse(NPMX_DEV))
}
