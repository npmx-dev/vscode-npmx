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
    expect(result!.message).toContain('2.7.0')
  })

  it('should not flag when already on latest', async () => {
    const ctx = createUpgradeContext('^2.7.0')
    const result = await checkUpgrade(ctx)

    expect(result).toBeUndefined()
  })

  it('should not flag when version is a dist tag', async () => {
    const ctx = createUpgradeContext('latest')
    const result = await checkUpgrade(ctx)

    expect(result).toBeUndefined()
  })

  it('should not flag when version is a dist tag with protocol', async () => {
    const ctx = createUpgradeContext('npm:latest')
    const result = await checkUpgrade(ctx)

    expect(result).toBeUndefined()
  })

  it('should flag prerelease upgrade within same pre-id', async () => {
    const ctx = createUpgradeContext('3.0.0-alpha.1')
    const result = await checkUpgrade(ctx)

    expect(result).toBeDefined()
    expect(result!.message).toContain('3.0.0-alpha.5')
  })

  it('should not flag prerelease when already on latest pre-id version', async () => {
    const ctx = createUpgradeContext('3.0.0-alpha.5')
    const result = await checkUpgrade(ctx)

    expect(result).toBeUndefined()
  })

  it('should preserve protocol prefix in message', async () => {
    const ctx = createUpgradeContext('npm:^1.0.0')
    const result = await checkUpgrade(ctx)

    expect(result).toBeDefined()
    expect(result!.message).toContain('npm:^2.7.0')
  })
})
