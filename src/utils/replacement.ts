import type { ModuleReplacement } from 'module-replacements'
import { NPMX_DEV_API } from '#constants'
import { logger } from '#state'
import { LRUCache } from 'lru-cache'
import { ofetch } from 'ofetch'
import { encodePackageName } from './npm'

const cache = new LRUCache<string, ModuleReplacement>({
  max: 500,
  ttl: 60 * 60 * 1000,
  updateAgeOnGet: true,
  allowStale: true,
  fetchMethod: async (name, staleValue, { signal }) => {
    const encodedName = encodePackageName(name)

    try {
      logger.info(`[${name}]: fetching replacement...`)
      const r = await ofetch<ModuleReplacement>(`${NPMX_DEV_API}/replacements/${encodedName}`, { signal })
        // Fallback for cache compatibility (LRUCache rejects null/undefined)
        ?? {}
      logger.info(`[${name}] fetching replacement done!`)
      return r
    } catch (err) {
      logger.warn(`[${name}] fetching replacement error: `, err)
    }
  },
})

export async function getReplacement(name: string) {
  return (await cache.fetch(name))!
}
