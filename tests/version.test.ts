import { describe, expect, it } from 'vitest'
import { parseVersion } from '../src/utils/version'

describe('parseVersion', () => {
  it('should parse plain version', () => {
    expect(parseVersion('1.0.0')).toEqual({
      protocol: null,
      prefix: '',
      semver: '1.0.0',
    })
  })

  it('should parse version with ^ prefix', () => {
    expect(parseVersion('^1.2.3')).toEqual({
      protocol: null,
      prefix: '^',
      semver: '1.2.3',
    })
  })

  it('should parse version with ~ prefix', () => {
    expect(parseVersion('~2.0.0')).toEqual({
      protocol: null,
      prefix: '~',
      semver: '2.0.0',
    })
  })

  it('should parse npm: protocol', () => {
    expect(parseVersion('npm:1.0.0')).toEqual({
      protocol: 'npm',
      prefix: '',
      semver: '1.0.0',
    })
  })

  it('should parse npm: protocol with prefix', () => {
    expect(parseVersion('npm:^1.0.0')).toEqual({
      protocol: 'npm',
      prefix: '^',
      semver: '1.0.0',
    })
  })

  it('should parse workspace: protocol', () => {
    expect(parseVersion('workspace:*')).toEqual({
      protocol: 'workspace',
      prefix: '',
      semver: '*',
    })
  })

  it('should parse catalog: protocol', () => {
    expect(parseVersion('catalog:default')).toEqual({
      protocol: 'catalog',
      prefix: '',
      semver: 'default',
    })
  })

  it('should parse jsr: protocol', () => {
    expect(parseVersion('jsr:^1.1.4')).toEqual({
      protocol: 'jsr',
      prefix: '^',
      semver: '1.1.4',
    })
  })

  it('should return null for URL-based versions', () => {
    expect(parseVersion('https://github.com/user/repo')).toBeNull()
    expect(parseVersion('git://github.com/user/repo')).toBeNull()
    expect(parseVersion('git+https://github.com/user/repo')).toBeNull()
  })
})
