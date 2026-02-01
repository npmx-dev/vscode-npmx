import type { ModuleReplacement } from 'module-replacements'
import { ofetch } from 'ofetch'
import { createCachedFetch } from './cache'
import { encodePackageName } from './npm'

export const NPMX_DEV_API = 'https://npmx.dev/api'

export const getReplacement = createCachedFetch<string, ModuleReplacement>({
  namespace: 'replacement',
  fetcher: async (name) => {
    const encodedName = encodePackageName(name)

    return await ofetch<ModuleReplacement>(`${NPMX_DEV_API}/replacements/${encodedName}`)
      // Fallback for cache compatibility (LRUCache rejects null/undefined)
      ?? {}
  },
})
