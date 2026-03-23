import type { ConfigKey, ConfigKeyTypeMap } from '#shared/meta'
import type { LanguageServiceContext } from '@volar/language-service'

export async function getConfig<T extends ConfigKey>(context: LanguageServiceContext, section: T): Promise<ConfigKeyTypeMap[T]> {
  return (await context.env.getConfiguration!(section))!
}
