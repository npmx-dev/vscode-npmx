import { describe, expect, it } from 'vitest'
import { parseVersion } from '../../src/utils/version'

describe('parseVersion', () => {
  it('should parse plain version', () => {
    expect(parseVersion('1.0.0')).toEqual({
      protocol: null,
      semver: '1.0.0',
    })
  })

  it('should parse npm: protocol', () => {
    expect(parseVersion('npm:~1.0.0')).toEqual({
      protocol: 'npm',
      semver: '~1.0.0',
    })
  })

  it('should parse workspace: protocol', () => {
    expect(parseVersion('workspace:*')).toEqual({
      protocol: 'workspace',
      semver: '*',
    })
  })

  it('should parse catalog: protocol', () => {
    expect(parseVersion('catalog:default')).toEqual({
      protocol: 'catalog',
      semver: 'default',
    })
  })

  it('should parse jsr: protocol', () => {
    expect(parseVersion('jsr:^1.1.4')).toEqual({
      protocol: 'jsr',
      semver: '^1.1.4',
    })
  })

  it('should return null for URL-based versions', () => {
    expect(parseVersion('https://github.com/user/repo')).toBeNull()
    expect(parseVersion('git://github.com/user/repo')).toBeNull()
    expect(parseVersion('git+https://github.com/user/repo')).toBeNull()
  })
})
