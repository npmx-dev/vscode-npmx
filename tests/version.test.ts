import { describe, expect, it } from 'vitest'
import { getPrereleaseId, lt, parseVersion } from '../src/utils/version'

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

describe('getPrereleaseId', () => {
  it('should return null for stable versions', () => {
    expect(getPrereleaseId('1.0.0')).toBeNull()
  })

  it('should extract identifier', () => {
    expect(getPrereleaseId('2.0.0-beta.1')).toBe('beta')
  })

  it('should handle prerelease without dots', () => {
    expect(getPrereleaseId('1.0.0-canary')).toBe('canary')
  })
})

describe('lt', () => {
  it('should compare major versions', () => {
    expect(lt('1.0.0', '2.0.0')).toBe(true)
    expect(lt('2.0.0', '1.0.0')).toBe(false)
  })

  it('should compare minor versions', () => {
    expect(lt('1.0.0', '1.1.0')).toBe(true)
    expect(lt('1.1.0', '1.0.0')).toBe(false)
  })

  it('should compare patch versions', () => {
    expect(lt('1.0.0', '1.0.1')).toBe(true)
    expect(lt('1.0.1', '1.0.0')).toBe(false)
  })

  it('should return false for equal versions', () => {
    expect(lt('1.0.0', '1.0.0')).toBe(false)
  })

  it('should treat prerelease as less than release', () => {
    expect(lt('1.0.0-beta.1', '1.0.0')).toBe(true)
    expect(lt('1.0.0', '1.0.0-beta.1')).toBe(false)
  })

  it('should compare prerelease versions numerically', () => {
    expect(lt('1.0.0-beta.1', '1.0.0-beta.2')).toBe(true)
    expect(lt('1.0.0-beta.2', '1.0.0-beta.1')).toBe(false)
  })

  it('should compare different prerelease identifiers', () => {
    expect(lt('1.0.0-alpha.1', '1.0.0-beta.1')).toBe(true)
    expect(lt('1.0.0-beta.1', '1.0.0-alpha.1')).toBe(false)
  })

  it('should handle prerelease with fewer segments', () => {
    expect(lt('1.0.0-beta', '1.0.0-beta.1')).toBe(true)
    expect(lt('1.0.0-beta.1', '1.0.0-beta')).toBe(false)
  })
})
