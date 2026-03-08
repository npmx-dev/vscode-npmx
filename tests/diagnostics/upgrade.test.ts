import type { PackageInfo } from '#utils/api/package'
import type { ResolveUpgradeOptions } from '../../src/providers/diagnostics/rules/upgrade'
import { resolveExactVersion } from '#utils/package'
import { isSupportedProtocol, parseVersion } from '#utils/version'
import { describe, expect, it } from 'vitest'
import { resolveUpgrade } from '../../src/providers/diagnostics/rules/upgrade'

const distTags: Record<string, string> = {
  latest: '2.7.0',
  next: '3.0.0-alpha.5',
}

const versionsMeta: Record<string, object> = {
  '1.0.0': {},
  '2.7.0': {},
  '3.0.0-alpha.1': {},
  '3.0.0-alpha.5': {},
}

function createOptions(version: string, ignoreList: string[] = []): ResolveUpgradeOptions | undefined {
  const parsed = parseVersion(version)
  if (!parsed)
    return
  const exactVersion = isSupportedProtocol(parsed.protocol)
    ? resolveExactVersion({ distTags, versionsMeta, versionToTag: new Map() } as PackageInfo, parsed.version)
    : null
  if (!exactVersion)
    return
  return { name: 'vite', version, parsed, exactVersion, distTags, ignoreList }
}

describe('resolveUpgrade', () => {
  it('should flag when latest is greater than current version', () => {
    expect(resolveUpgrade(createOptions('^1.0.0')!)).toMatchObject({
      name: 'vite',
      targetVersion: '^2.7.0',
    })
  })

  it.each([
    '^2.7.0',
    'latest',
    'npm:latest',
    '3.0.0-alpha.5',
  ])('should not flag for "%s"', (version) => {
    const options = createOptions(version)
    if (!options) {
      expect(options).toBeUndefined()
      return
    }
    expect(resolveUpgrade(options)).toBeUndefined()
  })

  it('should flag prerelease upgrade within same pre-id', () => {
    expect(resolveUpgrade(createOptions('3.0.0-alpha.1')!)).toMatchObject({
      targetVersion: '3.0.0-alpha.5',
    })
  })

  it('should not flag when target upgrade version is ignored', () => {
    expect(resolveUpgrade(createOptions('^1.0.0', ['vite@^2.7.0'])!)).toBeUndefined()
  })

  it('should preserve protocol prefix in targetVersion', () => {
    expect(resolveUpgrade(createOptions('npm:^1.0.0')!)).toMatchObject({
      targetVersion: 'npm:^2.7.0',
    })
  })
})
