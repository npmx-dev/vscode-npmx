import { describe, expect, it } from 'vitest'
import { checkDeprecation } from '../../src/providers/diagnostics/rules/deprecation'
import { createContext } from './context'

function createDeprecationContext(version: string) {
  return createContext({
    name: 'lodash',
    version,
    distTags: { latest: '2.0.0' },
    versionsMeta: {
      '1.0.0': {
        deprecated: '1.0.0',
      },
      '1.2.0': {
        deprecated: '1.2.0',
      },
      '2.0.0': {},
    },
  })
}

describe('checkDeprecation', () => {
  it('should flag deprecated version', async () => {
    const ctx = createDeprecationContext('1.0.0')
    const result = await checkDeprecation(ctx)

    expect(result).toBeDefined()
    expect(result!.message).toMatchInlineSnapshot('"lodash v1.0.0 has been deprecated: 1.0.0"')
    expect(result!.code).toMatchObject({ value: 'deprecation' })
  })

  it('resolve range to the highest matching deprecated version', async () => {
    const ctx = createDeprecationContext('^1.0.0')
    const result = await checkDeprecation(ctx)

    expect(result).toBeDefined()
    expect(result!.message).toMatchInlineSnapshot('"lodash v1.2.0 has been deprecated: 1.2.0"')
    expect(result!.code).toMatchObject({ value: 'deprecation' })
  })

  it('should not flag non-deprecated version', async () => {
    const ctx = createDeprecationContext('^2.0.0')
    const result = await checkDeprecation(ctx)

    expect(result).toBeUndefined()
  })
})
