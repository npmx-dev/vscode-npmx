import { describe, expect, it } from 'vitest'
import { createDependencyInfo } from '../test-utils/dependency'
import {
  getResolvedDependencyAtOffset,
  getResolvedDependencyNameAtOffset,
  getResolvedDependencySpecAtOffset,
} from './document'

describe('dependency offset helpers', () => {
  const dependency = createDependencyInfo({
    nameRange: [10, 16],
    specRange: [20, 26],
  })
  const dependencies = [dependency]

  it('matches dependency names separately from specs', () => {
    expect(getResolvedDependencyNameAtOffset(dependencies, 10)).toBe(dependency)
    expect(getResolvedDependencyNameAtOffset(dependencies, 16)).toBe(dependency)
    expect(getResolvedDependencyNameAtOffset(dependencies, 20)).toBeUndefined()
  })

  it('matches dependency specs separately from names', () => {
    expect(getResolvedDependencySpecAtOffset(dependencies, 20)).toBe(dependency)
    expect(getResolvedDependencySpecAtOffset(dependencies, 26)).toBe(dependency)
    expect(getResolvedDependencySpecAtOffset(dependencies, 10)).toBeUndefined()
  })

  it('keeps the combined dependency lookup behavior', () => {
    expect(getResolvedDependencyAtOffset(dependencies, 10)).toBe(dependency)
    expect(getResolvedDependencyAtOffset(dependencies, 20)).toBe(dependency)
    expect(getResolvedDependencyAtOffset(dependencies, 30)).toBeUndefined()
  })
})
