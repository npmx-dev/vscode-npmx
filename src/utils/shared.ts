export function lazyInit<T>(factory: () => T): () => T {
  let cached: { value: T } | undefined
  return () => {
    if (!cached)
      cached = { value: factory() }
    return cached.value
  }
}
