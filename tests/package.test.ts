import { describe, expect, it } from 'vitest'
import { encodePackageName, parseVersion } from '../src/utils/package'

describe('encodePackageName', () => {
  it('should encode regular package name', () => {
    expect(encodePackageName('lodash')).toBe('lodash')
  })

  it('should encode scoped package name', () => {
    expect(encodePackageName('@vue/core')).toBe('@vue%2Fcore')
  })
})

describe('parseVersion', () => {
  it('should parse plain version', () => {
    expect(parseVersion('1.0.0')).toEqual({
      prefix: '',
      version: '1.0.0',
      protocol: null,
    })
  })

  it('should parse version with ^ prefix', () => {
    expect(parseVersion('^1.2.3')).toEqual({
      prefix: '^',
      version: '1.2.3',
      protocol: null,
    })
  })

  it('should parse version with ~ prefix', () => {
    expect(parseVersion('~2.0.0')).toEqual({
      prefix: '~',
      version: '2.0.0',
      protocol: null,
    })
  })

  it('should parse npm: protocol', () => {
    expect(parseVersion('npm:1.0.0')).toEqual({
      prefix: '',
      version: '1.0.0',
      protocol: 'npm',
    })
  })

  it('should parse npm: protocol with prefix', () => {
    expect(parseVersion('npm:^1.0.0')).toEqual({
      prefix: '^',
      version: '1.0.0',
      protocol: 'npm',
    })
  })

  it('should return null for workspace:', () => {
    expect(parseVersion('workspace:*')).toBeNull()
  })

  it('should return null for catalog:', () => {
    expect(parseVersion('catalog:default')).toBeNull()
  })

  it('should return null for jsr:', () => {
    expect(parseVersion('jsr:@std/fs')).toBeNull()
  })
})
