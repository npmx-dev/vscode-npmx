import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Uri } from 'vscode'
import { findNearestFile, walkAncestors } from '../src/utils/resolve'
import { mockFileSystem } from './__mocks__/filesystem'

describe('walkAncestors', () => {
  it('should yield all ancestor directories', () => {
    const uri = Uri.file('/a/b/c/file.js')
    const ancestors = [...walkAncestors(uri)]
    expect(ancestors.map((u) => u.path)).toEqual([
      '/a/b/c/file.js',
      '/a/b/c',
      '/a/b',
      '/a',
      '/',
    ])
  })

  it('should stop when shouldStop returns true', () => {
    const uri = Uri.file('/a/b/c/file.js')
    const ancestors = [...walkAncestors(uri, (u) => u.path === '/a/b')]
    expect(ancestors.map((u) => u.path)).toEqual([
      '/a/b/c/file.js',
      '/a/b/c',
      '/a/b',
    ])
  })

  it('should handle root URI', () => {
    const uri = Uri.file('/')
    const ancestors = [...walkAncestors(uri)]
    expect(ancestors.map((u) => u.path)).toEqual(['/'])
  })
})

describe('findNearestFile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should find a file in a parent directory', async () => {
    mockFileSystem({
      '/a/b/target.txt': '',
    })

    const result = await findNearestFile('target.txt', Uri.file('/a/b/c/d'))
    expect(result).toBeDefined()
    expect(result!.path).toBe('/a/b/target.txt')
  })

  it('should return the closest match', async () => {
    mockFileSystem({
      '/a/target.txt': '',
      '/a/b/c/target.txt': '',
    })

    const result = await findNearestFile('target.txt', Uri.file('/a/b/c/d'))
    expect(result).toBeDefined()
    expect(result!.path).toBe('/a/b/c/target.txt')
  })

  it('should return undefined when file is not found', async () => {
    mockFileSystem({})

    const result = await findNearestFile('target.txt', Uri.file('/a/b/c'))
    expect(result).toBeUndefined()
  })

  it('should respect shouldStop', async () => {
    mockFileSystem({
      '/a/target.txt': '',
    })

    const result = await findNearestFile('target.txt', Uri.file('/a/b/c'), (u) => u.path === '/a/b')
    expect(result).toBeUndefined()
  })
})
