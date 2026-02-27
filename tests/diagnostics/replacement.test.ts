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
  it('should flag native replacement', async () => {
    const result = await checkReplacement(createReplacementContext('left-pad'))

    expect(result).toBeDefined()
    expect(result!.message).toMatchInlineSnapshot('"This can be replaced with String.prototype.padStart, available since Node 8.0.0."')
  })

  it('should flag simple replacement', async () => {
    const result = await checkReplacement(createReplacementContext('is-number'))

    expect(result).toBeDefined()
    expect(result!.message).toMatchInlineSnapshot(`
      "The community has flagged this package as redundant, with the advice:
      Use typeof v === "number" || (typeof v === "string" && Number.isFinite(+v))."
    `)
  })

  it('should flag documented replacement', async () => {
    const result = await checkReplacement(createReplacementContext('@jsdevtools/ez-spawn'))

    expect(result).toBeDefined()
    expect(result!.message).toMatchInlineSnapshot('"The community has flagged this package as having more performant alternatives."')
  })

  it('should not flag when no replacement found', async () => {
    const result = await checkReplacement(createReplacementContext('vitest'))

    expect(result).toBeUndefined()
  })
})
