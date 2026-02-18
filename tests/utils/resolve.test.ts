import { describe, expect, it } from 'vitest'
import { Uri } from 'vscode'
import { findNearestFile, walkAncestors } from '../../src/utils/resolve'

const root = Uri.file(process.cwd())

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
    const result = await findNearestFile('package.json', Uri.joinPath(root, 'src/utils'))
    expect(result).toBeDefined()
    expect(result!.fsPath).toBe(Uri.joinPath(root, 'package.json').fsPath)
  })

  it('should return the closest match', async () => {
    const result = await findNearestFile('package.json', Uri.joinPath(root, 'playground'))
    expect(result).toBeDefined()
    expect(result!.fsPath).toBe(Uri.joinPath(root, 'playground/package.json').fsPath)
  })

  it('should return undefined when file is not found', async () => {
    const result = await findNearestFile('__nonexistent_file__', Uri.joinPath(root, 'src'))
    expect(result).toBeUndefined()
  })

  it('should respect shouldStop', async () => {
    const stop = Uri.joinPath(root, 'src')
    const result = await findNearestFile('package.json', Uri.joinPath(root, 'src/utils'), (u) => u.fsPath === stop.fsPath)
    expect(result).toBeUndefined()
  })
})
