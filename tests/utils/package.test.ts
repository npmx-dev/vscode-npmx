import type { PackageInfo } from '#utils/api/package'
import { describe, expect, it } from 'vitest'
import { encodePackageName, isJsrNpmPackage, jsrNpmToJsrName, parsePackageId, resolveExactVersion } from '../../src/utils/package'

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
    expect(jsrNpmToJsrName('@jsr/luca__cases')).toBe('@luca/cases')
    expect(jsrNpmToJsrName('@jsr/std__path')).toBe('@std/path')
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

describe('resolveExactVersion', () => {
  it.each([
    ['', '4.10.0'],
    ['*', '4.10.0'],
    ['^3.0.0', '3.1.0'],
    ['^4.0.0', '4.10.0'],
    ['^5.0.0', null],
    ['latest', '4.10.0'],
    ['next', '4.11.0-beta.1'],
    ['beta', null],
  ])('should resolve $0 to $1', (spec, version) => {
    const pkg = {
      distTags: {
        latest: '4.10.0',
        next: '4.11.0-beta.1',
      },
      versionsMeta: {
        '3.0.0': {},
        '3.1.0': {},
        '4.10.0': {},
        '4.10.1': {
          deprecated: 'Unplanned Release',
        },
        '4.11.0-beta.1': {},
      },
    } as unknown as PackageInfo

    expect(resolveExactVersion(pkg, spec)).toBe(version)
  })
})
