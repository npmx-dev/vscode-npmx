import type { ModuleReplacement, ModuleReplacementMapping } from 'module-replacements'
import { defineCachedFunction } from 'ocache'
import { ofetch } from 'ofetch'
import { CACHE_MAX_AGE_ONE_DAY, NPMX_DEV_API } from '../constants'
import { encodePackageName } from '../utils/package'

export const getReplacement = defineCachedFunction<{
  mapping: ModuleReplacementMapping
  replacement: ModuleReplacement
} | null, [string]>(async (name) => {
  const encodedName = encodePackageName(name)

  const result = await ofetch<{
    mapping: ModuleReplacementMapping
    replacement: ModuleReplacement
  } | undefined>(`${NPMX_DEV_API}/replacements/${encodedName}`, {
    ignoreResponseError: true,
  }) ?? null

  return result
}, {
  name: 'replacement',
  getKey: (name) => name,
  maxAge: CACHE_MAX_AGE_ONE_DAY,
})
