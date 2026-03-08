import { describe, expect, it } from 'vitest'
import { checkReplacement } from '../../src/providers/diagnostics/rules/replacement'
import { createContext } from './context'

function createReplacementContext(name: string) {
  return createContext({ name, version: '^1.0.0' })
}

describe('checkReplacement', () => {
  it('should flag when replacement found', async () => {
    expect(await checkReplacement(createReplacementContext('left-pad'))).toMatchObject({
      code: { value: 'replacement' },
    })
  })

  it('should not flag when no replacement found', async () => {
    expect(await checkReplacement(createReplacementContext('vitest'))).toBeUndefined()
  })
})
