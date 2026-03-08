import type { ResolvedDependencyInfo } from '#types/context'
import { describe, expect, it } from 'vitest'
import { formatUpgradeVersion } from '../../src/utils/version'

describe('formatUpgradeVersion', () => {
  it.each([
    [['^1.0.0'], '2.0.0', '^2.0.0'],
    [['~1.0.0'], '1.1.0', '~1.1.0'],
    [['1.0.0'], '2.0.0', '2.0.0'],
    [['1.x'], '2.0.0', '^2.0.0'],
    [['1.0.x'], '1.1.0', '~1.1.0'],
    [['>=1.0.0'], '2.0.0', '>=2.0.0'],
    [['*'], '2.0.0', '*'],
    [[''], '2.0.0', '*'],
    [['x'], '2.0.0', '*'],
    [['^1.0.0', 'npm:foo@^1.0.0'], '2.0.0', '^2.0.0'],
    [['1.0.0', 'npm:foo@1.0.0'], '2.0.0', '2.0.0'],
    [['*', 'npm:foo@*'], '2.0.0', '*'],
    [['^1.0.0', 'npm:foo@^1.0.0', 'my-foo'], '2.0.0', 'npm:foo@^2.0.0'],
  ])('should preserve $0', ([resolvedSpec, rawSpec = resolvedSpec, rawName = 'foo', protocol = 'npm'], target, expected) => {
    expect(
      formatUpgradeVersion({ protocol, rawName, rawSpec, resolvedName: 'foo', resolvedSpec } as ResolvedDependencyInfo, target),
    ).toBe(expected)
  })
})
