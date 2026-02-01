import { describe, expect, it, vi } from 'vitest'
import { memoize } from '../src/utils/memoize'

describe('memoize', () => {
  it('should cache sync function result', () => {
    const fn = vi.fn((x: number) => x * 2)
    const memoized = memoize(fn)

    expect(memoized(5)).toBe(10)
    expect(memoized(5)).toBe(10)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should cache async function result', async () => {
    const fn = vi.fn(async (x: number) => x * 2)
    const memoized = memoize(fn)

    expect(await memoized(5)).toBe(10)
    expect(await memoized(5)).toBe(10)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should use custom getKey', async () => {
    const fn = vi.fn(async (params: { id: number }) => params.id * 2)
    const memoized = memoize(fn, {
      getKey: (p) => `id-${p.id}`,
    })

    await memoized({ id: 1 })
    await memoized({ id: 1 })
    expect(fn).toHaveBeenCalledTimes(1)

    await memoized({ id: 2 })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should deduplicate concurrent async calls', async () => {
    const fn = vi.fn(
      () => new Promise<string>((resolve) => setTimeout(resolve, 50, 'data')),
    )
    const memoized = memoize(fn)

    const [r1, r2, r3] = await Promise.all([
      memoized('key'),
      memoized('key'),
      memoized('key'),
    ])

    expect(r1).toBe('data')
    expect(r2).toBe('data')
    expect(r3).toBe('data')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should refetch after TTL expires', async () => {
    vi.useFakeTimers()

    const fn = vi.fn(async () => 'data')
    const memoized = memoize(fn, { ttl: 100 })

    await memoized('key')
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(50)
    await memoized('key')
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(60)
    await memoized('key')
    expect(fn).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('should return stale value on async error', async () => {
    const fn = vi.fn<(k: string) => Promise<string>>()
      .mockResolvedValueOnce('initial')
      .mockRejectedValueOnce(new Error('fail'))

    const memoized = memoize(fn, { ttl: 0 })

    expect(await memoized('key')).toBe('initial')
    expect(await memoized('key')).toBe('initial')
  })
})
