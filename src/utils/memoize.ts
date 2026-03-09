import type { Uri } from 'vscode'
import { CACHE_TTL_ONE_DAY } from '#constants'

type MemoizeKey = string | Uri

export interface MemoizeOptions<K> {
  getKey?: (params: K) => MemoizeKey
  ttl?: number | false
  /** Max number of entries to keep; evicts one when exceeded (prefer null/undefined values, else oldest). */
  maxSize?: number
  fallbackToCachedOnError?: boolean
}

interface MemoizeEntry<V> {
  value: Awaited<V>
  expiresAt?: number
}

type MemoizeReturn<R> = R extends Promise<infer V> ? Promise<V | undefined> : R | undefined

export interface MemoizedFunction<P, V> {
  (params: P): MemoizeReturn<V>
  delete: (params: P) => void
}

export function memoize<P, V>(fn: (params: P) => V, options: MemoizeOptions<P> = {}): MemoizedFunction<P, V> {
  const {
    getKey = String,
    ttl = CACHE_TTL_ONE_DAY,
    maxSize = 200,
    fallbackToCachedOnError = true,
  } = options

  const cache = new Map<MemoizeKey, MemoizeEntry<V>>()
  const pending = new Map<MemoizeKey, Promise<any>>()
  const versions = new Map<MemoizeKey, number>()

  function get(key: MemoizeKey): Awaited<V> | undefined {
    const entry = cache.get(key)
    if (!entry)
      return

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      cache.delete(key)
      return
    }

    return entry.value
  }

  function evictOne(): void {
    const now = Date.now()
    for (const [k, entry] of cache) {
      if (entry.value == null || (entry.expiresAt && entry.expiresAt <= now)) {
        cache.delete(k)
        return
      }
    }
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined)
      cache.delete(firstKey)
  }

  function getVersion(key: MemoizeKey): number {
    return versions.get(key) ?? 0
  }

  function set(key: MemoizeKey, value: Awaited<V>, keyVersion: number): void {
    if (keyVersion !== getVersion(key))
      return

    if (Number.isFinite(maxSize) && cache.size >= maxSize && !cache.has(key))
      evictOne()
    cache.set(key, {
      value,
      expiresAt: ttl ? Date.now() + ttl : undefined,
    })
  }

  const cachedFn = function cachedFn(params: P) {
    const key = getKey(params)
    const keyVersion = getVersion(key)
    const staleEntry = cache.get(key)

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
          set(key, value, keyVersion)
          return value
        })
        .catch((error) => {
          if (fallbackToCachedOnError)
            return staleEntry?.value ?? get(key)

          throw error
        })
        .finally(() => {
          if (pending.get(key) === promise)
            pending.delete(key)
        }) as any
      pending.set(key, promise)
      return promise
    } else if (result !== undefined) {
      set(key, result as Awaited<V>, keyVersion)
      return result
    }
  } as MemoizedFunction<P, V>

  cachedFn.delete = (p: P) => {
    const key = getKey(p)
    cache.delete(key)
    pending.delete(key)
    versions.set(key, getVersion(key) + 1)
  }

  return cachedFn
}
