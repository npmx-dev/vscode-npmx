import type { Uri } from 'vscode'
import { CACHE_TTL_ONE_DAY } from '#constants'

type MemoizeKey = string | Uri

export interface MemoizeOptions<K> {
  getKey?: (params: K) => MemoizeKey
  ttl?: number
}

interface MemoizeEntry<V> {
  value: Awaited<V>
  expiresAt?: number
}

type MemoizeReturn<R> = R extends Promise<infer V> ? Promise<V | undefined> : R | undefined

export function memoize<P, V>(fn: (params: P) => V, options: MemoizeOptions<P> = {}): (params: P) => MemoizeReturn<V> {
  const {
    getKey = String,
    ttl = CACHE_TTL_ONE_DAY,
  } = options

  const cache = new Map<MemoizeKey, MemoizeEntry<V>>()
  const pending = new Map<MemoizeKey, Promise<any>>()

  function get(key: MemoizeKey): Awaited<V> | undefined {
    const entry = cache.get(key)
    if (!entry)
      return

    if (entry.expiresAt && entry.expiresAt <= Date.now())
      return

    return entry.value
  }

  function set(key: MemoizeKey, value: Awaited<V>): void {
    cache.set(key, {
      value,
      expiresAt: ttl ? Date.now() + ttl : undefined,
    })
  }

  return function cachedFn(params: P) {
    const key = getKey(params)

    const hit = get(key)
    if (hit !== undefined)
      return hit

    const inflight = pending.get(key)
    if (inflight)
      return inflight

    const result = fn(params)

    if (result instanceof Promise) {
      const promise = result
        .then((value) => {
          set(key, value)
          return value
        })
        .catch(() => cache.get(key)?.value)
        .finally(() => {
          pending.delete(key)
        }) as any
      pending.set(key, promise)
      return promise
    } else if (result !== undefined) {
      set(key, result as Awaited<V>)
      return result
    }
  }
}
