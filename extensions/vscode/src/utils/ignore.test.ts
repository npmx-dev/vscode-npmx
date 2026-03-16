import { describe, expect, it } from 'vitest'
import { checkIgnored } from './ignore'

describe('checkIgnored', () => {
  it('should match exact package name', () => {
    expect(checkIgnored({
      ignoreList: ['lodash'],
      name: 'lodash',
    })).toBe(true)
  })

  it('should match package name and version pair', () => {
    expect(checkIgnored({
      ignoreList: ['lodash@4.17.21'],
      name: 'lodash',
      version: '4.17.21',
    })).toBe(true)
  })

  it('should match package-level ignore for package id input', () => {
    expect(checkIgnored({
      ignoreList: ['@babel/core'],
      name: '@babel/core@7.0.0',
    })).toBe(true)
  })

  it('should return false when item is not ignored', () => {
    expect(checkIgnored({
      ignoreList: ['lodash'],
      name: 'express',
    })).toBe(false)
  })
})
