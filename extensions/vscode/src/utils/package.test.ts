import type { PackageInfo } from '#api/package'
import { describe, expect, it } from 'vitest'
import { encodePackageName, resolveExactVersion } from './package'

describe('encodePackageName', () => {
  it('should encode regular package name', () => {
    expect(encodePackageName('lodash')).toBe('lodash')
  })

  it('should encode scoped package name', () => {
    expect(encodePackageName('@vue/core')).toBe('@vue%2Fcore')
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
