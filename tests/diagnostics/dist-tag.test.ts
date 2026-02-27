import { describe, expect, it } from 'vitest'
import { checkDistTag } from '../../src/providers/diagnostics/rules/dist-tag'
import { createContext } from './context'

describe('checkDistTag', () => {
  it('should flag when version matches a dist tag', async () => {
    const ctx = createContext({ name: 'lodash', version: 'latest', distTags: { latest: '2.0.0' } })
    const result = await checkDistTag(ctx)

    expect(result).toBeDefined()
    expect(result!.code).toMatchObject({ value: 'dist-tag' })
  })

  it('should not flag when version does not match any dist tag', async () => {
    const ctx = createContext({ name: 'lodash', version: 'next', distTags: { latest: '2.0.0' } })
    const result = await checkDistTag(ctx)

    expect(result).toBeUndefined()
  })
})
