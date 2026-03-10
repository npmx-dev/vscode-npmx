import type { ModuleReplacement } from 'module-replacements'
import { CACHE_MAX_AGE_ONE_DAY, NPMX_DEV_API } from '#constants'
import { logger } from '#state'
import { defineCachedFunction } from 'ocache'
import { ofetch } from 'ofetch'
import { encodePackageName } from '../package'

export const getReplacement = defineCachedFunction<ModuleReplacement | null, [string]>(async (name) => {
  logger.info(`Fetching replacements for ${name}`)
  const encodedName = encodePackageName(name)

  const result = await ofetch<ModuleReplacement | undefined>(`${NPMX_DEV_API}/replacements/${encodedName}`) ?? null
  logger.info(`Fetched replacements for ${name}`)

  return result
}, {
  name: 'replacement',
  getKey: (name) => name,
  maxAge: CACHE_MAX_AGE_ONE_DAY,
})
