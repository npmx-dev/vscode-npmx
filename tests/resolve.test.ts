import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Uri } from 'vscode'
import { resolvePackageRelativePath } from '../src/utils/resolve'
import { mockFileSystem } from './__mocks__/filesystem'

describe('resolvePackageRelativePath', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should resolve simple package file', async () => {
    mockFileSystem({
      '/root/node_modules/pkg/package.json': JSON.stringify({
        name: 'pkg',
        version: '1.0.0',
      }),
    })

    const uri = Uri.file('/root/node_modules/pkg/src/index.js')
    const result = await resolvePackageRelativePath(uri)

    expect(result).toBeDefined()

    const { manifest, relativePath } = result!
    expect(manifest).toEqual({ name: 'pkg', version: '1.0.0' })
    expect(relativePath).toBe('src/index.js')
  })

  it('should handle bundled dependencies', async () => {
    mockFileSystem({
      '/root/node_modules/parent/package.json': JSON.stringify({
        name: 'parent',
        version: '1.0.0',
      }),
      '/root/node_modules/parent/node_modules/child/package.json': JSON.stringify({
        name: 'child',
        version: '2.0.0',
      }),
    })

    const uri = Uri.file('/root/node_modules/parent/node_modules/child/index.js')
    const result = await resolvePackageRelativePath(uri)

    expect(result).toBeDefined()

    const { manifest, relativePath } = result!
    expect(manifest).toEqual({ name: 'child', version: '2.0.0' })
    expect(relativePath).toBe('index.js')
  })

  it('should handle pnpm structure', async () => {
    mockFileSystem({
      '/root/.pnpm/pkg@1.0.0/node_modules/pkg/package.json': JSON.stringify({
        name: 'pkg',
        version: '1.0.0',
      }),
    })

    const uri = Uri.file('/root/.pnpm/pkg@1.0.0/node_modules/pkg/src/index.js')
    const result = await resolvePackageRelativePath(uri)

    expect(result).toBeDefined()

    const { manifest, relativePath } = result!
    expect(manifest).toEqual({ name: 'pkg', version: '1.0.0' })
    expect(relativePath).toBe('src/index.js')
  })

  it('should handle scoped packages', async () => {
    mockFileSystem({
      '/root/node_modules/@scope/pkg/package.json': JSON.stringify({
        name: '@scope/pkg',
        version: '1.0.0',
      }),
    })

    const uri = Uri.file('/root/node_modules/@scope/pkg/src/index.js')
    const result = await resolvePackageRelativePath(uri)

    expect(result).toBeDefined()

    const { manifest, relativePath } = result!
    expect(manifest).toEqual({ name: '@scope/pkg', version: '1.0.0' })
    expect(relativePath).toBe('src/index.js')
  })

  it('should return undefined if no package.json found', async () => {
    mockFileSystem({})

    const uri = Uri.file('/root/no-pkg/file.js')
    const result = await resolvePackageRelativePath(uri)
    expect(result).toBeUndefined()
  })

  it('should return undefined even when a package.json exists outside the node_modules directory', async () => {
    mockFileSystem({
      '/root/package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
    })

    const uri = Uri.file('/root/node_modules/pkg/file.js')
    const result = await resolvePackageRelativePath(uri)
    expect(result).toBeUndefined()
  })

  it('should skip invalid manifests', async () => {
    mockFileSystem({
      '/root/node_modules/pkg/package.json': JSON.stringify({
        name: 'pkg',
        version: '1.0.0',
      }),

      // Context: Side effects is often configured per-directory as the only key
      // in a `package.json`, but it does not actually represent a real package.
      '/root/node_modules/pkg/src/package.json': JSON.stringify({
        sideEffects: false,
      }),
    })

    const uri = Uri.file('/root/node_modules/pkg/src/index.js')
    const result = await resolvePackageRelativePath(uri)
    expect(result).toBeDefined()

    const { manifest, relativePath } = result!
    expect(manifest).toEqual({ name: 'pkg', version: '1.0.0' })
    expect(relativePath).toBe('src/index.js')
  })
})
