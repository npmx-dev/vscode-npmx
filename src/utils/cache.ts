import { CACHE_TTL_ONE_DAY } from '#constants'
import { logger } from '#state'

interface Entry<V> {
  value?: V
  expiresAt?: number
  promise?: Promise<V | undefined>
}

export function createCachedFetch<K, V>(options: {
  namespace: string
  fetcher: (params: K) => Promise<V | undefined>
  key?: (params: K) => string
  ttl?: number
}) {
  const {
    namespace,
    fetcher,
    key: toKey = String,
    ttl = CACHE_TTL_ONE_DAY,
  } = options

  const map = new Map<string, Entry<V>>()

  return async function cachedFetch(input: K) {
    const key = toKey(input)
    const now = Date.now()

    const hit = map.get(key)

    if (hit?.value && (!hit.expiresAt || hit.expiresAt > now))
      return hit.value

    if (hit?.promise)
      return hit.promise

    logger.info(`[${namespace}]: fetching ${key}...`)
    const p = fetcher(input).then((v) => {
      map.set(key, {
        value: v,
        expiresAt: ttl ? now + ttl : undefined,
      })
      logger.info(`[${namespace}] fetching ${key} done!`)
      return v
    }).catch((err) => {
      logger.warn(`[${namespace}] fetching ${key} error: `, err)
      return hit?.value
    }).finally(() => {
      const e = map.get(key)
      if (e)
        delete e.promise
    })

    map.set(key, { promise: p })

    return p
  }
}
