import { describe, expect, it } from 'vitest'
import { formatUpgradeVersion } from '../../src/utils/version'

describe('formatUpgradeVersion', () => {
  it('should preserve ^ prefix', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: '^1.0.0', rawSpec: '^1.0.0' }, '2.0.0')).toBe('^2.0.0')
  })

  it('should preserve ~ prefix', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: '~1.0.0', rawSpec: '~1.0.0' }, '1.1.0')).toBe('~1.1.0')
  })

  it('should handle pinned version', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: '1.0.0', rawSpec: '1.0.0' }, '2.0.0')).toBe('2.0.0')
  })

  it('should preserve >= prefix', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: '>=1.0.0', rawSpec: '>=1.0.0' }, '2.0.0')).toBe('>=2.0.0')
  })

  it('should return * for wildcard', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: '*', rawSpec: '*' }, '2.0.0')).toBe('*')
  })

  it('should return * for empty semver', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: '', rawSpec: '' }, '2.0.0')).toBe('*')
  })

  it('should handle x-range major wildcard', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: 'x', rawSpec: 'x' }, '2.0.0')).toBe('*')
  })

  it('should handle x-range minor wildcard as ^', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: '1.x', rawSpec: '1.x' }, '2.0.0')).toBe('^2.0.0')
  })

  it('should handle x-range patch wildcard as ~', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: '1.0.x', rawSpec: '1.0.x' }, '1.1.0')).toBe('~1.1.0')
  })

  it('should include protocol in result', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: '^1.0.0', rawSpec: 'npm:^1.0.0' }, '2.0.0')).toBe('npm:^2.0.0')
  })

  it('should handle pinned version with protocol', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: '1.0.0', rawSpec: 'npm:1.0.0' }, '2.0.0')).toBe('npm:2.0.0')
  })

  it('should preserve protocol for wildcard', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'foo', rawName: 'foo', resolvedSpec: '*', rawSpec: 'npm:*' }, '2.0.0')).toBe('npm:*')
  })

  it('should preserve alias name in formatted version', () => {
    expect(formatUpgradeVersion({ protocol: 'npm', resolvedName: 'lodash', rawName: 'my-lodash', resolvedSpec: '~3.0.0', rawSpec: 'npm:lodash@~3.0.0' }, '4.0.0')).toBe('npm:lodash@~4.0.0')
  })
})
