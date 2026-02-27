import type { PackageInfo } from '#utils/api/package'
import { describe, expect, it } from 'vitest'
import { resolveUpgradeTargetVersion } from '../../src/utils/upgrade'

function createPackageInfo(distTags: Record<string, string>): PackageInfo {
  return {
    distTags,
  } as PackageInfo
}

describe('resolveUpgradeTargetVersion', () => {
  const pkg = createPackageInfo({
    latest: '2.7.0',
    next: '3.0.0-alpha.5',
    beta: '3.0.0-beta.3',
  })

  it.each([
    { exactVersion: '1.0.0', expected: '2.7.0' },
    { exactVersion: '2.7.0', expected: undefined },
    { exactVersion: '3.0.0-alpha.1', expected: '3.0.0-alpha.5' },
    { exactVersion: '3.0.0-alpha.5', expected: undefined },
    { exactVersion: '3.0.0-rc.1', expected: undefined },
  ])('should resolve target for $exactVersion to $expected', ({ exactVersion, expected }) => {
    expect(resolveUpgradeTargetVersion(pkg, exactVersion)).toBe(expected)
  })
})
