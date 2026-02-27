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
  it('should create upgrade diagnostic payload', async () => {
    const result = await checkUpgrade(createUpgradeContext('^1.0.0'))

    expect(result).toBeDefined()
    expect(result!.code).toMatchObject({ value: 'upgrade' })
    expect(result!.message).toMatchInlineSnapshot('"New version available: ^2.7.0"')
  })

  it('should preserve protocol prefix in diagnostic message', async () => {
    const result = await checkUpgrade(createUpgradeContext('npm:^1.0.0'))

    expect(result).toBeDefined()
    expect(result!.code).toMatchObject({ value: 'upgrade' })
    expect(result!.message).toMatchInlineSnapshot('"New version available: npm:^2.7.0"')
  })

  it('should return undefined for unsupported protocol', async () => {
    const result = await checkUpgrade(createUpgradeContext('workspace:^1.0.0'))

    expect(result).toBeUndefined()
  })
})
