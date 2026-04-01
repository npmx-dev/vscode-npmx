import type { ConfigurationTarget } from 'npmx-shared/constants'
import { checkIgnored } from 'npmx-language-core/utils'
import { scopedConfigs } from 'npmx-shared/meta'
import { workspace } from 'vscode'

export async function addToIgnore(scope: string, name: string, target: ConfigurationTarget) {
  const ignoreScope = `ignore.${scope}`
  const extensionConfig = workspace.getConfiguration(scopedConfigs.scope)
  const current = extensionConfig.get<string[]>(ignoreScope, [])

  if (checkIgnored({ ignoreList: current, name }))
    return

  await extensionConfig.update(ignoreScope, [...current, name], target)
}
