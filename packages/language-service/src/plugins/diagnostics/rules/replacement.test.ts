import { describe, expect, it } from 'vitest'
import { createContext } from './__tests__/utils'
import { checkReplacement } from './replacement'

function createReplacementContext(name: string) {
  return createContext({ name, version: '^1.0.0' })
}

describe('checkReplacement', () => {
  it('should not flag when no replacement found', async () => {
    expect(await checkReplacement(createReplacementContext('vitest'), [])).toBeUndefined()
  })
})
