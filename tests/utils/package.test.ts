import { describe, expect, it } from 'vitest'
import { encodePackageName, resolveExactVersion } from '../../src/utils/package'

describe('encodePackageName', () => {
  it('should encode regular package name', () => {
    expect(encodePackageName('lodash')).toBe('lodash')
  })

  it('should encode scoped package name', () => {
    expect(encodePackageName('@vue/core')).toBe('@vue%2Fcore')
  })
})

describe('resolveExactVersion', () => {
  it('should resolve version range without distTags', () => {
    expect(resolveExactVersion(undefined, '^1.0.0')).toBeNull()
  })
})
