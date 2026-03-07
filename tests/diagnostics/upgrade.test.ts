import { config } from '#state'
import { describe, expect, it } from 'vitest'
import { checkUpgrade } from '../../src/providers/diagnostics/rules/upgrade'
import { createContext } from './context'

function createUpgradeContext(version: string) {
  return createContext({
    name: 'vite',
    version,
    distTags: {
      latest: '2.7.0',
      next: '3.0.0-alpha.5',
    },
    versionsMeta: {
      '1.0.0': {},
      '2.7.0': {},
      '3.0.0-alpha.1': {},
      '3.0.0-alpha.5': {},
    },
  })
}

describe('checkUpgrade', () => {
  it('should flag when latest is greater than current version', async () => {
    const ctx = createUpgradeContext('^1.0.0')
    const result = await checkUpgrade(ctx)

    expect(result).toBeDefined()
    expect(result!.code).toMatchObject({ value: 'upgrade' })
    expect(result!.message).toMatchInlineSnapshot('""vite" can be upgraded to ^2.7.0."')
  })

  it.each([
    '^2.7.0',
    'latest',
    'npm:latest',
    '3.0.0-alpha.5',
  ])('should not flag for "%s"', async (version) => {
    const ctx = createUpgradeContext(version)
    const result = await checkUpgrade(ctx)

    expect(result).toBeUndefined()
  })

  it('should flag prerelease upgrade within same pre-id', async () => {
    const ctx = createUpgradeContext('3.0.0-alpha.1')
    const result = await checkUpgrade(ctx)

    expect(result).toBeDefined()
    expect(result!.message).toMatchInlineSnapshot('""vite" can be upgraded to 3.0.0-alpha.5."')
  })

  it('should not flag when target upgrade version is ignored', async () => {
    config.ignore.upgrade.push('vite@^2.7.0')
    try {
      const ctx = createUpgradeContext('^1.0.0')
      const result = await checkUpgrade(ctx)
      expect(result).toBeUndefined()
    } finally {
      config.ignore.upgrade.length = 0
    }
  })

  it('should preserve protocol prefix in message', async () => {
    const ctx = createUpgradeContext('npm:^1.0.0')
    const result = await checkUpgrade(ctx)

    expect(result).toBeDefined()
    expect(result!.message).toMatchInlineSnapshot('""vite" can be upgraded to npm:^2.7.0."')
  })
})
