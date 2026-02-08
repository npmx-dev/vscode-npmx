import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Uri, workspace } from 'vscode'
import { mockFileSystem } from './__mocks__/filesystem'

describe('mockFileSystem', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('`readFile`', () => {
    it('should mock matched paths', async () => {
      mockFileSystem({
        '/test/file.txt': 'hello world',
      })

      const uri = Uri.file('/test/file.txt')
      const content = await workspace.fs.readFile(uri)

      expect(new TextDecoder().decode(content)).toBe('hello world')
    })

    it('should throw error for unmatched paths', async () => {
      mockFileSystem({})

      const uri = Uri.file('/does-not-exist.txt')
      await expect(workspace.fs.readFile(uri)).rejects.toThrow('File not found')
    })

    it('should handle multiple files', async () => {
      mockFileSystem({
        '/a.js': 'content a',
        '/b.js': 'content b',
      })

      const contentA = await workspace.fs.readFile(Uri.file('/a.js'))
      const contentB = await workspace.fs.readFile(Uri.file('/b.js'))

      expect(new TextDecoder().decode(contentA)).toBe('content a')
      expect(new TextDecoder().decode(contentB)).toBe('content b')
    })
  })
})
