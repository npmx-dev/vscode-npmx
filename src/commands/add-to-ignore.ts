import type { ConfigurationTarget } from 'vscode'
import { scopedConfigs } from '#shared/meta'
import { checkIgnored } from '#utils/ignore'
import { workspace } from 'vscode'

export async function addToIgnore(scope: string, name: string, target: ConfigurationTarget) {
  const ignoreScope = `ignore.${scope}`
  const extensionConfig = workspace.getConfiguration(scopedConfigs.scope)
  const current = extensionConfig.get<string[]>(ignoreScope, [])

  if (checkIgnored({ ignoreList: current, name }))
    return

  await extensionConfig.update(ignoreScope, [...current, name], target)
}
