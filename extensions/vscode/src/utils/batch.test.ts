import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBatchRunner } from '../../src/utils/batch'

describe('createBatchRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should batch different tasks in the same tick', async () => {
    const runBatch = vi.fn(async (tasks: string[]) => {
      const values = new Map<string, string>()
      tasks.forEach((task) => {
        values.set(task, task.toUpperCase())
      })
      return { values, errors: new Map<string, unknown>() }
    })

    const run = createBatchRunner<string, string>({
      runBatch,
    })

    const [a, b] = await Promise.all([
      run('a'),
      run('b'),
    ])

    expect(a).toBe('A')
    expect(b).toBe('B')
    expect(runBatch).toHaveBeenCalledTimes(1)
    expect(runBatch).toHaveBeenCalledWith(['a', 'b'])
  })

  it('should deduplicate same-key requests in one batch', async () => {
    const runBatch = vi.fn(async (tasks: string[]) => {
      const values = new Map<string, string>()
      tasks.forEach((task) => {
        values.set(task, `${task}-resolved`)
      })
      return { values, errors: new Map<string, unknown>() }
    })

    const run = createBatchRunner<string, string>({
      runBatch,
    })

    const [first, second] = await Promise.all([
      run('pkg'),
      run('pkg'),
    ])

    expect(first).toBe('pkg-resolved')
    expect(second).toBe('pkg-resolved')
    expect(runBatch).toHaveBeenCalledTimes(1)
    expect(runBatch).toHaveBeenCalledWith(['pkg'])
  })

  it('should reject all tasks when runBatch throws', async () => {
    const runBatch = vi.fn(async () => {
      throw new Error('batch failed')
    })

    const run = createBatchRunner<string, string>({
      runBatch,
    })

    const [a, b] = await Promise.allSettled([
      run('a'),
      run('b'),
    ])

    expect(a.status).toBe('rejected')
    expect(b.status).toBe('rejected')
    expect(runBatch).toHaveBeenCalledTimes(1)
  })

  it('should flush immediately when maxSize is reached and split into multiple batches', async () => {
    const runBatch = vi.fn(async (tasks: string[]) => {
      const values = new Map<string, string>()
      tasks.forEach((task) => {
        values.set(task, task.toUpperCase())
      })
      return { values, errors: new Map<string, unknown>() }
    })

    const run = createBatchRunner<string, string>({
      maxSize: 2,
      runBatch,
    })

    const a = run('a')
    expect(runBatch).not.toHaveBeenCalled()

    const [, b, c] = await Promise.all([
      a,
      run('b'),
      run('c'),
    ])

    expect(await a).toBe('A')
    expect(b).toBe('B')
    expect(c).toBe('C')
    expect(runBatch).toHaveBeenCalledTimes(2)
    expect(runBatch).toHaveBeenNthCalledWith(1, ['a', 'b'])
    expect(runBatch).toHaveBeenNthCalledWith(2, ['c'])
  })

  it('should reject errored or missing outcomes', async () => {
    const runBatch = vi.fn(async () => ({
      values: new Map<string, string>([['a', 'A']]),
      errors: new Map<string, unknown>([['b', new Error('b failed')]]),
    }))

    const run = createBatchRunner<string, string>({
      runBatch,
    })

    const [a, b, c] = await Promise.allSettled([
      run('a'),
      run('b'),
      run('c'),
    ])

    expect(a).toEqual({ status: 'fulfilled', value: 'A' })
    expect(b.status).toBe('rejected')
    expect(c.status).toBe('rejected')
    expect(runBatch).toHaveBeenCalledTimes(1)
  })
})
