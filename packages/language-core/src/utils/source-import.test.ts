import { describe, expect, it } from 'vitest'
import { getImportSpecifier, getImportSpecifierAtOffset, getWordRangeAtOffset } from './source-import'

function getRange(text: string, target: string, fromIndex = 0): [number, number] {
  const index = text.indexOf(target, fromIndex)
  if (index === -1)
    throw new Error(`Missing target "${target}" in test input`)

  return [index, index + target.length]
}

function getLastRange(text: string, target: string): [number, number] {
  const index = text.lastIndexOf(target)
  if (index === -1)
    throw new Error(`Missing target "${target}" in test input`)

  return [index, index + target.length]
}

describe('getWordRangeAtOffset', () => {
  it.each([
    [`import foo from 'lodash'`, 'foo', [7, 10]],
    [`const lodash = require('lodash')`, 'lodash', [6, 12]],
    ['lodash import', 'lodash', [0, 6]],
    ['import lodash', 'lodash', [7, 13]],
    [`import {\n  foo,\n} from\n  'lodash'`, 'lodash', [26, 32]],
  ])('should return range for %s targeting %s', (text, target, expected) => {
    expect(getWordRangeAtOffset(text, text.indexOf(target) + 1)).toEqual(expected)
  })

  it('should return undefined for non-word character', () => {
    expect(getWordRangeAtOffset(`import foo from 'lodash'`, 6)).toBeUndefined()
  })

  it.each([
    [`import foo from '@babel/core'`, '@', [17, 28]],
    [`import foo from '@babel/core'`, 'babel', [17, 28]],
    [`import 'lodash/fp'`, '/', [8, 17]],
    [`import 'lodash/fp'`, 'lodash', [8, 17]],
  ])('should include special chars in package name (%s at %s)', (text, target, expected) => {
    expect(getWordRangeAtOffset(text, text.indexOf(target) + 1)).toEqual(expected)
  })
})

describe('getImportSpecifier', () => {
  it.each([
    [`import foo from 'lodash'`, 'lodash', 'lodash'],
    [`import 'vite/client'`, 'vite', 'vite/client'],
    [`export * from '@scope/pkg/subpath'`, '@scope/pkg', '@scope/pkg/subpath'],
    [`await import('zod')`, 'zod', 'zod'],
    [`import {\n  foo,\n  bar,\n} from 'lodash'`, 'lodash', 'lodash'],
    [`await import(\n  'zod'\n)`, 'zod', 'zod'],
    [`import { foo }\nfrom 'lodash'`, 'lodash', 'lodash'],
    [`import {\n  foo,\n} from\n  'lodash'`, 'lodash', 'lodash'],
  ])('should extract from %s', (text, packageName, specifier) => {
    expect(getImportSpecifier(text, getRange(text, packageName))).toEqual({
      specifier,
      packageName,
    })
  })

  it.each([
    [`const react = require('react')`, 'react'],
    [`const x = require(\n  'react'\n)`, 'react'],
    [`const lodash =\n  require('lodash')`, 'lodash'],
  ])('should extract from require in %s', (text, packageName) => {
    expect(getImportSpecifier(text, getLastRange(text, packageName))).toEqual({
      specifier: packageName,
      packageName,
    })
  })

  it.each([
    [`import foo from './local'`, 'local'],
    [`import foo from '../local'`, 'local'],
    [`import foo from '/abs'`, 'abs'],
    [`import foo from 'node:fs'`, 'fs'],
    [`import foo from 'https://example.com/mod.ts'`, 'example'],
    ['const lodash = someValue', 'lodash'],
    [`'lodash'`, 'lodash'],
  ])('should return undefined for %s', (text, target) => {
    expect(getImportSpecifier(text, getRange(text, target))).toBeUndefined()
  })

  it('should extract import in full document', () => {
    const text = `import fetch from \n 'ofetch'\n\nconst string = 'ofetch'`

    expect(getImportSpecifier(text, getRange(text, 'ofetch'))).toEqual({
      specifier: 'ofetch',
      packageName: 'ofetch',
    })
  })

  it('should not match a plain string that follows a multi-line import', () => {
    const text = `import fetch from \n 'ofetch'\n\nconst string = 'ofetch'`

    expect(getImportSpecifier(text, getLastRange(text, 'ofetch'))).toBeUndefined()
  })

  it.each([
    [`import foo from 'lodash'\r\n`, 'lodash', 'lodash'],
    [`import 'lodash/fp'\r\n`, 'lodash', 'lodash/fp'],
  ])('should extract from CRLF line endings (%s)', (text, packageName, specifier) => {
    expect(getImportSpecifier(text, getRange(text, packageName))).toEqual({
      specifier,
      packageName,
    })
  })

  it('should extract from require with CRLF', () => {
    const text = `const react = require('react')\r\n`
    expect(getImportSpecifier(text, getLastRange(text, 'react'))).toEqual({
      specifier: 'react',
      packageName: 'react',
    })
  })
})

describe('getImportSpecifierAtOffset', () => {
  it.each([
    [`import foo from 'lodash'`, 'lodash', 'lodash', 'lodash'],
    [`import 'lodash/fp'`, 'lodash', 'lodash/fp', 'lodash'],
    [`import { foo } from 'lodash'`, 'lodash', 'lodash', 'lodash'],
    [`const pkg = await import('lodash')`, 'lodash', 'lodash', 'lodash'],
    [`import foo from '@babel/core'`, '@babel', '@babel/core', '@babel/core'],
    [`import {\n  foo,\n} from\n  'lodash'`, 'lodash', 'lodash', 'lodash'],
    [`import fetch from \n 'ofetch'\n\nconst string = 'ofetch'`, 'ofetch', 'ofetch', 'ofetch'],
  ])('should extract from %s', (text, target, specifier, packageName) => {
    expect(getImportSpecifierAtOffset(text, text.indexOf(target) + 1)).toEqual({ specifier, packageName })
  })

  it.each([
    [`import foo from './utils'`, 'utils'],
    [`import foo from 'node:fs'`, 'node:fs'],
    ['const lodash = someValue', 'lodash'],
    [`import fetch from 
 'ofetch'

const string = 'ofetch'`, 'ofetch'],
  ])('should return undefined for %s', (text, target) => {
    expect(getImportSpecifierAtOffset(text, text.lastIndexOf(target) + 1)).toBeUndefined()
  })

  it('should return undefined when not on a word', () => {
    expect(getImportSpecifierAtOffset(`import foo from 'lodash'`, 16)).toBeUndefined()
  })
})
