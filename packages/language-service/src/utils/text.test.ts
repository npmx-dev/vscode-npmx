import { describe, expect, it } from 'vitest'
import { getWordRangeAtOffset } from './text'

describe('getWordRangeAtOffset', () => {
  it('should return word range for valid word', () => {
    const text = "import foo from 'lodash'"
    const result = getWordRangeAtOffset(text, text.indexOf('foo'))

    expect(result).toEqual([7, 10])
  })

  it('should return undefined for non-word character', () => {
    const text = "import foo from 'lodash'"
    const result = getWordRangeAtOffset(text, 6)

    expect(result).toBeUndefined()
  })

  it('should extend range to full word', () => {
    const text = "const lodash = require('lodash')"
    const result = getWordRangeAtOffset(text, text.indexOf('lodash') + 1)

    expect(result).toEqual([6, 12])
  })

  it('should handle word at start of line', () => {
    const text = 'lodash import'
    const result = getWordRangeAtOffset(text, 0)

    expect(result).toEqual([0, 6])
  })

  it('should handle word at end of line', () => {
    const text = 'import lodash'
    const result = getWordRangeAtOffset(text, text.length - 1)

    expect(result).toEqual([7, 13])
  })

  it('should handle multiline import case', () => {
    const text = "import {\n  foo,\n} from\n  'lodash'"
    const result = getWordRangeAtOffset(text, text.indexOf('lodash') + 1)

    expect(result).toEqual([26, 32])
  })
})