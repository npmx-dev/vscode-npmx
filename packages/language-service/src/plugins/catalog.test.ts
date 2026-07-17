import { describe, expect, it } from 'vitest'
import { createDependencyInfo } from '../test-utils/dependency'
import { getCatalogDependencyAtOffset } from './catalog'

describe('getCatalogDependencyAtOffset', () => {
  const dependency = createDependencyInfo({
    rawSpec: 'catalog:',
    nameRange: [10, 16],
    specRange: [20, 28],
    protocol: 'catalog',
    categoryName: 'default',
  })

  it('matches catalog specs separately from package names', () => {
    expect(getCatalogDependencyAtOffset([dependency], 10)).toBeUndefined()
    expect(getCatalogDependencyAtOffset([dependency], 20)).toBe(dependency)
    expect(getCatalogDependencyAtOffset([dependency], 28)).toBe(dependency)
  })

  it('ignores non-catalog specs', () => {
    const npmDependency = createDependencyInfo({
      rawSpec: '^1.0.0',
      protocol: 'npm',
      specRange: [20, 28],
    })

    expect(getCatalogDependencyAtOffset([npmDependency], 20)).toBeUndefined()
  })
})
