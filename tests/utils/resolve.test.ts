import path from 'node:path'
import { findNearestFile, walkAncestors } from '#utils/resolve'
import { describe, expect, it } from 'vitest'
import { Uri } from 'vscode'

const root = process.cwd()

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
  it('should find a file in a parent directory', async () => {
    const result = await findNearestFile('package.json', Uri.file(path.join(root, 'src/utils')))
    expect(result).toBeDefined()
    expect(result!.fsPath).toBe(path.join(root, 'package.json'))
  })

  it('should return the closest match', async () => {
    const result = await findNearestFile('package.json', Uri.file(path.join(root, 'playground')))
    expect(result).toBeDefined()
    expect(result!.fsPath).toBe(path.join(root, 'playground/package.json'))
  })

  it('should return undefined when file is not found', async () => {
    const result = await findNearestFile('__nonexistent_file__', Uri.file(path.join(root, 'src')))
    expect(result).toBeUndefined()
  })

  it('should respect shouldStop', async () => {
    const result = await findNearestFile('package.json', Uri.file(path.join(root, 'src/utils')), (u) => u.fsPath === path.join(root, 'src'))
    expect(result).toBeUndefined()
  })
})
