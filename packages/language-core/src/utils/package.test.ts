import { describe, expect, it } from 'vitest'
import { isJsrNpmPackage, jsrNpmToJsrName, parsePackageId } from './package'

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

describe('isJsrNpmPackage', () => {
  it('should detect @jsr/ scoped packages', () => {
    expect(isJsrNpmPackage('@jsr/luca__cases')).toBe(true)
    expect(isJsrNpmPackage('@jsr/std__path')).toBe(true)
  })

  it('should not detect non-jsr packages', () => {
    expect(isJsrNpmPackage('lodash')).toBe(false)
    expect(isJsrNpmPackage('@types/node')).toBe(false)
  })
})

describe('jsrNpmToJsrName', () => {
  it('should convert @jsr/ npm name to JSR name', () => {
    expect(jsrNpmToJsrName('@jsr/luca__cases')).toBe('@luca/cases')
    expect(jsrNpmToJsrName('@jsr/std__path')).toBe('@std/path')
  })
})
