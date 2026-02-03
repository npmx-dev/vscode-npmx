import type { ModuleReplacement } from 'module-replacements'
import { NPMX_DEV_API } from '#constants'
import { logger } from '#state'
import { ofetch } from 'ofetch'
import { memoize } from '../memoize'
import { encodePackageName } from '../package'

export const getReplacement = memoize<string, Promise<ModuleReplacement | null>>(async (name) => {
  logger.info(`Fetching replacements for ${name}`)
  const encodedName = encodePackageName(name)

  const result = await ofetch<ModuleReplacement | undefined>(`${NPMX_DEV_API}/replacements/${encodedName}`) ?? null
  logger.info(`Fetched replacements for ${name}`)

  return result
})
