import type { OffsetRange } from 'npmx-language-core/types'
import type { DependencyInfo } from 'npmx-language-core/workspace'

function isOffsetInRange(offset: number, [start, end]: OffsetRange): boolean {
  return offset >= start && offset <= end
}

export function getResolvedDependencyAtOffset(
  dependencies: DependencyInfo[],
  offset: number,
): DependencyInfo | undefined {
  return dependencies.find((dep) =>
    isOffsetInRange(offset, dep.nameRange) || isOffsetInRange(offset, dep.specRange),
  )
}
