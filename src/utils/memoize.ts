import { CACHE_TTL_ONE_DAY } from '#constants'

export interface CachedOptions<K> {
  getKey?: (params: K) => string
  ttl?: number
}

interface CacheEntry<V> {
  value: Awaited<V>
  expiresAt?: number
}

export function memoize<P, V>(fn: (params: P) => V, options: CachedOptions<P> = {}): (params: P) => V {
  const {
    getKey = String,
    ttl = CACHE_TTL_ONE_DAY,
  } = options

  const cache = new Map<string, CacheEntry<V>>()
  const pending = new Map<string, V>()

  function get(params: P): Awaited<V> | undefined {
    const entry = cache.get(getKey(params))
    if (!entry)
      return
    if (entry.expiresAt && entry.expiresAt <= Date.now())
      return

    return entry.value
  }

  function set(params: P, value: Awaited<V>): void {
    cache.set(getKey(params), {
      value,
      expiresAt: ttl ? Date.now() + ttl : undefined,
    })
  }

  return function cachedFn(params: P): V {
    const hit = get(params)
    if (hit !== undefined)
      return hit

    const key = getKey(params)
    const inflight = pending.get(key)
    if (inflight)
      return inflight

    const result = fn(params)

    if (result instanceof Promise) {
      const promise = result
        .then((value) => {
          set(params, value)
          return value
        })
        .catch(() => cache.get(key)?.value)
        .finally(() => {
          pending.delete(key)
        }) as V
      pending.set(key, promise)
      return promise
    } else {
      set(params, result as Awaited<V>)
      return result
    }
  }
}
