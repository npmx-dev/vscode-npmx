import { describe, expect, it } from 'vitest'
import { extractImportSpecifier } from './import-resolution'

describe('extractImportSpecifier', () => {
  it('should extract import from single-line import statement', () => {
    const text = "import foo from 'lodash'"
    const offset = text.indexOf('lodash') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toEqual({ specifier: 'lodash', packageName: 'lodash' })
  })

  it('should extract import from bare import statement', () => {
    const text = "import 'lodash/fp'"
    const offset = text.indexOf('lodash') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toEqual({ specifier: 'lodash/fp', packageName: 'lodash' })
  })

  it('should extract import from named import', () => {
    const text = "import { foo } from 'lodash'"
    const offset = text.indexOf('lodash') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toEqual({ specifier: 'lodash', packageName: 'lodash' })
  })

  it('should extract import from require call with assignment', () => {
    const text = "const lodash = require('lodash')"
    const offset = text.lastIndexOf('lodash') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toEqual({ specifier: 'lodash', packageName: 'lodash' })
  })

  it('should extract import from multiline require call with assignment', () => {
    const text = "const lodash =\n  require('lodash')"
    const offset = text.lastIndexOf('lodash') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toEqual({ specifier: 'lodash', packageName: 'lodash' })
  })

  it('should extract import from multiline import with specifier on separate line', () => {
    const text = "import {\n  foo,\n} from\n  'lodash'"
    const offset = text.indexOf('lodash') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toEqual({ specifier: 'lodash', packageName: 'lodash' })
  })

  it('should extract import from dynamic import', () => {
    const text = "const pkg = await import('lodash')"
    const offset = text.indexOf('lodash') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toEqual({ specifier: 'lodash', packageName: 'lodash' })
  })

  it('should handle scoped package', () => {
    const text = "import foo from '@babel/core'"
    const offset = text.indexOf('@babel') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toEqual({ specifier: '@babel/core', packageName: '@babel/core' })
  })

  it('should return undefined for relative import', () => {
    const text = "import foo from './utils'"
    const offset = text.indexOf('./utils') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toBeUndefined()
  })

  it('should return undefined for absolute import', () => {
    const text = "import foo from '/utils'"
    const offset = text.indexOf('/utils') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toBeUndefined()
  })

  it('should return undefined for protocol import', () => {
    const text = "import foo from 'node:fs'"
    const offset = text.indexOf('node:fs') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toBeUndefined()
  })

  it('should return undefined when not on a word', () => {
    const text = "import foo from 'lodash'"
    const offset = text.indexOf("'")

    const result = extractImportSpecifier(text, offset)

    expect(result).toBeUndefined()
  })

  it('should return undefined when not inside import string', () => {
    const text = 'const lodash = someValue'
    const offset = text.indexOf('lodash') + 1

    const result = extractImportSpecifier(text, offset)

    expect(result).toBeUndefined()
  })
})
