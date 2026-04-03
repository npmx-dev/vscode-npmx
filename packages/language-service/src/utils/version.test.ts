import type { PackageInfo } from 'npmx-language-core/api/package'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import { describe, expect, it } from 'vitest'
import { formatUpgradeVersion, resolveUpgradeTiers } from './version'

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
      formatUpgradeVersion({ protocol, rawName, rawSpec, resolvedName: 'foo', resolvedSpec } as DependencyInfo, target),
    ).toBe(expected)
  })
})

function createPkg(versions: string[]): PackageInfo {
  const versionsMeta: Record<string, object> = {}
  for (const v of versions)
    versionsMeta[v] = {}
  return { versionsMeta, distTags: { latest: versions.at(-1)! } } as PackageInfo
}

describe('resolveUpgradeTiers', () => {
  it('returns all three tiers', () => {
    const pkg = createPkg(['1.0.0', '1.0.1', '1.0.2', '1.1.0', '1.2.0', '2.0.0', '3.0.0'])
    expect(resolveUpgradeTiers(pkg, '1.0.0')).toEqual([
      { type: 'patch', version: '1.0.2' },
      { type: 'minor', version: '1.2.0' },
      { type: 'major', version: '3.0.0' },
    ])
  })

  it('returns only patch and minor when no major upgrade exists', () => {
    const pkg = createPkg(['1.0.0', '1.0.3', '1.1.0'])
    expect(resolveUpgradeTiers(pkg, '1.0.0')).toEqual([
      { type: 'patch', version: '1.0.3' },
      { type: 'minor', version: '1.1.0' },
    ])
  })

  it('returns empty when already on latest', () => {
    const pkg = createPkg(['1.0.0', '1.0.1'])
    expect(resolveUpgradeTiers(pkg, '1.0.1')).toEqual([])
  })

  it('skips prerelease versions', () => {
    const pkg = createPkg(['1.0.0', '1.0.1', '2.0.0-beta.1'])
    expect(resolveUpgradeTiers(pkg, '1.0.0')).toEqual([
      { type: 'patch', version: '1.0.1' },
    ])
  })
})
