import { describe, expect, it } from 'vitest'
import { createContext } from './__tests__/utils'
import { checkReplacement } from './replacement'

function createReplacementContext(name: string) {
  return createContext({ name, version: '^1.0.0' })
}

describe('checkReplacement', () => {
  it('should flag when replacement found', async () => {
    const result = await checkReplacement(createReplacementContext('left-pad'), [])
    expect(result).toMatchInlineSnapshot(`
      {
        "code": "replacement",
        "codeDescription": {
          "href": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart",
        },
        "message": ""left-pad" can be replaced with String.prototype.padStart, available since Node 8.0.0.",
        "range": [
          0,
          8,
        ],
        "severity": 2,
      }
    `)
  })

  it('should not flag when no replacement found', async () => {
    expect(await checkReplacement(createReplacementContext('vitest'), [])).toBeUndefined()
  })
})
