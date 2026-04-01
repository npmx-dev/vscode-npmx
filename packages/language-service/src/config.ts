import type { LanguageServiceContext } from '@volar/language-service'
import type { ConfigKey, ConfigKeyTypeMap } from 'npmx-shared/meta'

export async function getConfig<T extends ConfigKey>(context: LanguageServiceContext, section: T): Promise<ConfigKeyTypeMap[T]> {
  return (await context.env.getConfiguration!(section))!
}
