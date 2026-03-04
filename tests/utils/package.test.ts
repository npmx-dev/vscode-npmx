import { describe, expect, it } from 'vitest'
import { encodePackageName, isJsrNpmPackage, jsrNpmToJsrName } from '../../src/utils/package'

describe('encodePackageName', () => {
  it('should encode regular package name', () => {
    expect(encodePackageName('lodash')).toBe('lodash')
  })

  it('should encode scoped package name', () => {
    expect(encodePackageName('@vue/core')).toBe('@vue%2Fcore')
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
    expect(jsrNpmToJsrName('@jsr/something')).toBe('something')
    expect(jsrNpmToJsrName('@jsr/luca__cases')).toBe('@luca/cases')
    expect(jsrNpmToJsrName('@jsr/std__path')).toBe('@std/path')
  })
})
