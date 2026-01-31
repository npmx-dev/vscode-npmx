export function isInRange(offset: number, [start, end]: [number, number, ...any]): boolean {
  return offset >= start && offset <= end
}
