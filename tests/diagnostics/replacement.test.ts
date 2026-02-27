import { describe, expect, it } from 'vitest'
import { checkReplacement } from '../../src/providers/diagnostics/rules/replacement'
import { createContext } from './context'

function createReplacementContext(name: string) {
  return createContext({
    name,
    version: '^1.0.0',
    distTags: { latest: '1.0.0' },
    versionsMeta: { '1.0.0': {} },
  })
}

describe('checkReplacement', () => {
  it('should flag when replacement found', async () => {
    const result = await checkReplacement(createReplacementContext('left-pad'))

    expect(result).toBeDefined()
    expect(result!.message).toBeDefined()
    expect(result!.code).toMatchObject({ value: 'replacement' })
  })

  it('should not flag when no replacement found', async () => {
    const result = await checkReplacement(createReplacementContext('vitest'))

    expect(result).toBeUndefined()
  })
})
