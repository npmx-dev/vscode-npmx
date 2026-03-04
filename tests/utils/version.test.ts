import { describe, expect, it } from 'vitest'
import { formatUpgradeVersion, parseVersion } from '../../src/utils/version'

describe('parseVersion', () => {
  it('should parse plain version', () => {
    expect(parseVersion('1.0.0')).toMatchInlineSnapshot(`
      {
        "aliasName": null,
        "protocol": null,
        "version": "1.0.0",
      }
    `)
  })

  it('should parse npm: protocol', () => {
    expect(parseVersion('npm:~1.0.0')).toMatchInlineSnapshot(`
      {
        "aliasName": null,
        "protocol": "npm",
        "version": "~1.0.0",
      }
    `)
  })

  it('should parse npm alias package', () => {
    expect(parseVersion('npm:lodash@~3.0.0')).toMatchInlineSnapshot(`
      {
        "aliasName": "lodash",
        "protocol": "npm",
        "version": "~3.0.0",
      }
    `)
  })

  it('should parse npm alias with scoped package', () => {
    expect(parseVersion('npm:@types/babel__core@^7.0.0')).toMatchInlineSnapshot(`
      {
        "aliasName": "@types/babel__core",
        "protocol": "npm",
        "version": "^7.0.0",
      }
    `)
    expect(parseVersion('npm:@jsr/luca__cases@^1.0.1')).toMatchInlineSnapshot(`
      {
        "aliasName": "@luca/cases",
        "protocol": "jsr",
        "version": "^1.0.1",
      }
    `)
  })

  it('should parse workspace: protocol', () => {
    expect(parseVersion('workspace:*')).toMatchInlineSnapshot(`
      {
        "aliasName": null,
        "protocol": "workspace",
        "version": "*",
      }
    `)
  })

  it('should parse catalog: protocol', () => {
    expect(parseVersion('catalog:default')).toMatchInlineSnapshot(`
      {
        "aliasName": null,
        "protocol": "catalog",
        "version": "default",
      }
    `)
  })

  it('should parse jsr: protocol', () => {
    expect(parseVersion('jsr:^1.1.4')).toMatchInlineSnapshot(`
      {
        "aliasName": null,
        "protocol": "jsr",
        "version": "^1.1.4",
      }
    `)
  })

  it('should return null for URL-based versions', () => {
    expect(parseVersion('https://github.com/user/repo')).toBeNull()
    expect(parseVersion('git://github.com/user/repo')).toBeNull()
    expect(parseVersion('git+https://github.com/user/repo')).toBeNull()
  })
})

describe('formatUpgradeVersion', () => {
  it('should preserve ^ prefix', () => {
    expect(formatUpgradeVersion({ protocol: null, aliasName: null, version: '^1.0.0' }, '2.0.0')).toBe('^2.0.0')
  })

  it('should preserve ~ prefix', () => {
    expect(formatUpgradeVersion({ protocol: null, aliasName: null, version: '~1.0.0' }, '1.1.0')).toBe('~1.1.0')
  })

  it('should handle pinned version', () => {
    expect(formatUpgradeVersion({ protocol: null, aliasName: null, version: '1.0.0' }, '2.0.0')).toBe('2.0.0')
  })

  it('should preserve >= prefix', () => {
    expect(formatUpgradeVersion({ protocol: null, aliasName: null, version: '>=1.0.0' }, '2.0.0')).toBe('>=2.0.0')
  })

  it('should return * for wildcard', () => {
    expect(formatUpgradeVersion({ protocol: null, aliasName: null, version: '*' }, '2.0.0')).toBe('*')
  })

  it('should return * for empty semver', () => {
    expect(formatUpgradeVersion({ protocol: null, aliasName: null, version: '' }, '2.0.0')).toBe('*')
  })

  it('should handle x-range major wildcard', () => {
    expect(formatUpgradeVersion({ protocol: null, aliasName: null, version: 'x' }, '2.0.0')).toBe('*')
  })

  it('should handle x-range minor wildcard as ^', () => {
    expect(formatUpgradeVersion({ protocol: null, aliasName: null, version: '1.x' }, '2.0.0')).toBe('^2.0.0')
  })

  it('should handle x-range patch wildcard as ~', () => {
    expect(formatUpgradeVersion({ protocol: null, aliasName: null, version: '1.0.x' }, '1.1.0')).toBe('~1.1.0')
  })

  it('should include protocol in result', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', aliasName: null, version: '^1.0.0' }, '2.0.0')).toBe('npm:^2.0.0')
  })

  it('should handle pinned version with protocol', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', aliasName: null, version: '1.0.0' }, '2.0.0')).toBe('npm:2.0.0')
  })

  it('should preserve protocol for wildcard', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', aliasName: null, version: '*' }, '2.0.0')).toBe('npm:*')
  })

  it('should preserve alias name in formatted version', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', aliasName: 'lodash', version: '~3.0.0' }, '4.0.0')).toBe('npm:lodash@~4.0.0')
  })
})
