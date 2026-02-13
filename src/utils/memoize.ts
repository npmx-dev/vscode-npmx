import type { ValidNode } from '#types/extractor'
import type { TextDocument, Uri } from 'vscode'
import { CACHE_TTL_ONE_DAY } from '#constants'

type MemoizeKey = string | Uri

export interface MemoizeOptions<K> {
  getKey?: (params: K) => MemoizeKey
  ttl?: number
  /** Max number of entries to keep; evicts one when exceeded (prefer null/undefined values, else oldest). */
  maxSize?: number
}

interface MemoizeEntry<V> {
  value: Awaited<V>
  expiresAt?: number
}

type MemoizeReturn<R> = R extends Promise<infer V> ? Promise<V | undefined> | V | undefined : R | undefined

export function memoize<P, V>(fn: (params: P) => V, options: MemoizeOptions<P> = {}): (params: P) => MemoizeReturn<V> {
  const {
    getKey = String,
    ttl = CACHE_TTL_ONE_DAY,
    maxSize = 200,
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

  function set(key: MemoizeKey, value: Awaited<V>): void {
    if (cache.size >= maxSize && !cache.has(key))
      evictOne()
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

export function createMemoizedParse<T extends ValidNode>(parse: (text: string) => T | null) {
  return memoize(
    (doc: TextDocument) => parse(doc.getText()),
    {
      getKey: (doc) => `${doc.uri}:${doc.version}`,
      maxSize: 1,
    },
  )
}
