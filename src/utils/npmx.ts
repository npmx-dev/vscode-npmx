import type { ModuleReplacement } from 'module-replacements'
import { ofetch } from 'ofetch'
import { memoize } from './memoize'
import { encodePackageName } from './npm'

export const NPMX_DEV_API = 'https://npmx.dev/api'

export const getReplacement = memoize<string, Promise<ModuleReplacement>>(async (name) => {
  const encodedName = encodePackageName(name)

  return await ofetch<ModuleReplacement>(`${NPMX_DEV_API}/replacements/${encodedName}`)
    // Fallback for cache compatibility (LRUCache rejects null/undefined)
    ?? {}
})
