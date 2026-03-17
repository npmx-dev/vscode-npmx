import type { ModuleReplacement } from 'module-replacements'
import { logger } from '#state'
import { CACHE_MAX_AGE_ONE_DAY, NPMX_DEV_API } from '#utils/constants'
import { encodePackageName } from '#utils/package'
import { defineCachedFunction } from 'ocache'
import { ofetch } from 'ofetch'

export const getReplacement = defineCachedFunction<ModuleReplacement | null, [string]>(async (name) => {
  logger.info(`[replacement] fetching for ${name}`)
  const encodedName = encodePackageName(name)

  const result = await ofetch<ModuleReplacement | undefined>(`${NPMX_DEV_API}/replacements/${encodedName}`, {
    ignoreResponseError: true,
  }) ?? null
  logger.info(`[replacement] fetched for ${name}`)

  return result
}, {
  name: 'replacement',
  getKey: (name) => name,
  maxAge: CACHE_MAX_AGE_ONE_DAY,
})
