export interface BatchRunResult<TResult> {
  values: Map<string, TResult>
  errors: Map<string, unknown>
}

export interface BatchRunnerOptions<TTask, TResult> {
  getKey?: (task: TTask) => string
  maxSize?: number
  runBatch: (tasks: TTask[]) => Promise<BatchRunResult<TResult>>
}

interface PendingRequest<TResult> {
  resolve: (value: TResult) => void
  reject: (reason?: unknown) => void
}

interface PendingTaskGroup<TTask, TResult> {
  task: TTask
  waiters: PendingRequest<TResult>[]
}

export function createBatchRunner<TTask, TResult>(options: BatchRunnerOptions<TTask, TResult>): (task: TTask) => Promise<TResult> {
  const {
    getKey = String,
    maxSize,
    runBatch,
  } = options
  const pendingTasksByKey = new Map<string, PendingTaskGroup<TTask, TResult>>()

  let isFlushScheduled = false

  const resolveTaskGroup = (group: PendingTaskGroup<TTask, TResult>, value: TResult) => {
    group.waiters.forEach(({ resolve }) => resolve(value))
  }

  const rejectTaskGroup = (group: PendingTaskGroup<TTask, TResult>, error: unknown) => {
    group.waiters.forEach(({ reject }) => reject(error))
  }

  const flushPendingTasks = async () => {
    isFlushScheduled = false
    if (pendingTasksByKey.size === 0)
      return

    const pendingTaskGroups = [...pendingTasksByKey.values()]
    pendingTasksByKey.clear()

    let batchResult: BatchRunResult<TResult>

    try {
      batchResult = await runBatch(pendingTaskGroups.map((group) => group.task))
    } catch (batchError) {
      pendingTaskGroups.forEach((group) => {
        rejectTaskGroup(group, batchError)
      })
      return
    }

    pendingTaskGroups.forEach((group) => {
      const taskKey = getKey(group.task)
      if (batchResult.values.has(taskKey)) {
        resolveTaskGroup(group, batchResult.values.get(taskKey)!)
        return
      }

      if (batchResult.errors.has(taskKey)) {
        rejectTaskGroup(group, batchResult.errors.get(taskKey))
        return
      }

      rejectTaskGroup(group, new Error(`Missing batch outcome for key "${taskKey}"`))
    })
  }

  return (task: TTask) => new Promise<TResult>((resolve, reject) => {
    const taskKey = getKey(task)
    const existingGroup = pendingTasksByKey.get(taskKey)

    if (existingGroup) {
      existingGroup.waiters.push({ resolve, reject })
    } else {
      pendingTasksByKey.set(taskKey, {
        task,
        waiters: [{ resolve, reject }],
      })
    }

    if (maxSize && pendingTasksByKey.size >= maxSize) {
      void flushPendingTasks()
    } else if (!isFlushScheduled) {
      isFlushScheduled = true
      queueMicrotask(() => {
        void flushPendingTasks()
      })
    }
  })
}
