import { describe, expect, it } from 'vitest'
import { encodePackageName, parsePackageId } from '../../src/utils/package'

describe('encodePackageName', () => {
  it('should encode regular package name', () => {
    expect(encodePackageName('lodash')).toBe('lodash')
  })

  it('should encode scoped package name', () => {
    expect(encodePackageName('@vue/core')).toBe('@vue%2Fcore')
  })
})

describe('parsePackageId', () => {
  it('should parse package id with version', () => {
    expect(parsePackageId('lodash@4.17.21')).toEqual({
      name: 'lodash',
      version: '4.17.21',
    })
  })

  it('should parse scoped package id with version', () => {
    expect(parsePackageId('@babel/core@7.0.0')).toEqual({
      name: '@babel/core',
      version: '7.0.0',
    })
  })

  it('should keep package name when version is missing', () => {
    expect(parsePackageId('@babel/core')).toEqual({
      name: '@babel/core',
      version: null,
    })
  })
})
