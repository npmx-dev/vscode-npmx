import type { ModuleReplacement } from 'module-replacements'
import { logger } from '#state'
import { ofetch } from 'ofetch'
import { memoize } from './memoize'
import { encodePackageName } from './npm'

export const NPMX_DEV_API = 'https://npmx.dev/api'

export const getReplacement = memoize<string, Promise<ModuleReplacement>>(async (name) => {
  logger.info(`Fetching replacement for ${name}`)
  const encodedName = encodePackageName(name)

  const result = await ofetch<ModuleReplacement>(`${NPMX_DEV_API}/replacements/${encodedName}`)
    // Fallback for cache compatibility (LRUCache rejects null/undefined)
    ?? {}
  logger.info(`Fetched replacement for ${name}`)
  return result
})
