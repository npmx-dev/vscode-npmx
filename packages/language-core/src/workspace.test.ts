import type { PackageManager, WorkspaceAdapter } from './workspace'
import { describe, expect, it } from 'vitest'
import { WorkspaceContext } from './workspace'

describe('workspaceContext', () => {
  it('loads bun workspace catalogs from the root package.json', async () => {
    const readPaths: string[] = []

    const adapter: WorkspaceAdapter = {
      async readFile(path) {
        readPaths.push(path)
        return `{
          "workspaces": ["packages/*"],
          "catalog": {
            "lodash": "^4.17.21"
          }
        }`
      },
      async fileExists(path) {
        return path === '/repo/package.json'
      },
      async detectPackageManager() {
        return 'bun'
      },
    }

    const ctx = await WorkspaceContext.create('/repo', adapter)

    expect(ctx.packageManager).toBe('bun')
    expect(ctx.workspaceFilePath).toBe('/repo/package.json')
    expect(await ctx.getCatalogs()).toEqual({
      default: {
        lodash: '^4.17.21',
      },
    })
    expect(readPaths).toEqual(['/repo/package.json'])
  })

  it('still loads workspace catalogs for pnpm workspaces', async () => {
    const checkedPaths: string[] = []

    const adapter: WorkspaceAdapter = {
      async readFile() {
        throw new Error('this test should not read a missing workspace file')
      },
      async fileExists(path) {
        checkedPaths.push(path)
        return false
      },
      async detectPackageManager() {
        return 'pnpm'
      },
    }

    const ctx = await WorkspaceContext.create('/repo', adapter)

    expect(ctx.packageManager).toBe('pnpm')
    expect(ctx.workspaceFilePath).toBe('/repo/pnpm-workspace.yaml')
    expect(await ctx.getCatalogs()).toBeUndefined()
    expect(checkedPaths).toEqual(['/repo/pnpm-workspace.yaml'])
  })

  it('ignores nested workspace files once the root workspace file path is known', async () => {
    const readPaths: string[] = []
    const files = new Map<string, string>([
      ['/repo/pnpm-workspace.yaml', `catalog:
  lodash: ^4.17.21
`],
      ['/repo/packages/app/pnpm-workspace.yaml', `catalog:
  semver: ^7.7.2
`],
    ])

    const adapter: WorkspaceAdapter = {
      async readFile(path) {
        readPaths.push(path)
        const content = files.get(path)
        if (!content)
          throw new Error(`Unexpected read: ${path}`)
        return content
      },
      async fileExists(path) {
        return files.has(path)
      },
      async detectPackageManager() {
        return 'pnpm'
      },
    }

    const ctx = await WorkspaceContext.create('/repo', adapter)
    const info = await ctx.loadWorkspaceFileInfo('/repo/packages/app/pnpm-workspace.yaml')

    expect(ctx.workspaceFilePath).toBe('/repo/pnpm-workspace.yaml')
    expect(info).toBeUndefined()
    expect(readPaths).toEqual(['/repo/pnpm-workspace.yaml'])
  })

  it('preserves the leading slash for windows-style uri paths', async () => {
    const checkedPaths: string[] = []

    const adapter: WorkspaceAdapter = {
      async readFile() {
        throw new Error('this test should not read a missing workspace file')
      },
      async fileExists(path) {
        checkedPaths.push(path)
        return false
      },
      async detectPackageManager() {
        return 'bun'
      },
    }

    const ctx = await WorkspaceContext.create('/d:/repo', adapter)

    expect(ctx.workspaceFilePath).toBe('/d:/repo/package.json')
    expect(checkedPaths).toEqual(['/d:/repo/package.json'])
  })

  it('resolves bun catalog dependencies for workspace packages', async () => {
    const files = new Map<string, string>([
      ['/repo/package.json', `{
        "workspaces": ["packages/*"],
        "catalog": {
          "lodash": "^4.17.21"
        },
        "catalogs": {
          "prod": {
            "@deno/doc": "jsr:^0.189.1"
          }
        }
      }`],
      ['/repo/packages/app/package.json', `{
        "name": "@playground/bun-app",
        "dependencies": {
          "lodash": "catalog:",
          "@deno/doc": "catalog:prod"
        }
      }`],
    ])

    const adapter: WorkspaceAdapter = {
      async readFile(path) {
        const content = files.get(path)
        if (!content)
          throw new Error(`Unexpected read: ${path}`)
        return content
      },
      async fileExists(path) {
        return files.has(path)
      },
      async detectPackageManager() {
        return 'bun'
      },
    }

    const ctx = await WorkspaceContext.create('/repo', adapter)
    const info = await ctx.loadPackageManifestInfo('/repo/packages/app/package.json')

    expect(info?.dependencies.map(({ rawName, resolvedSpec, resolvedProtocol }) => ({
      rawName,
      resolvedSpec,
      resolvedProtocol,
    }))).toEqual([
      {
        rawName: 'lodash',
        resolvedSpec: '^4.17.21',
        resolvedProtocol: 'npm',
      },
      {
        rawName: '@deno/doc',
        resolvedSpec: '^0.189.1',
        resolvedProtocol: 'jsr',
      },
    ])
  })

  describe('findInstalledPackageManifestPath', () => {
    interface InstallLookupFixtureOptions {
      files: string[]
      packageManager?: PackageManager
      realpaths?: [path: string, realpath: string][]
    }

    async function createInstallLookupFixture({
      files,
      packageManager = 'npm',
      realpaths = [],
    }: InstallLookupFixtureOptions) {
      const checkedPaths: string[] = []
      const fileSet = new Set(files)
      const realpathMap = new Map(realpaths)
      const adapter: WorkspaceAdapter = {
        async readFile() {
          throw new Error('this test should not read package manifests')
        },
        async fileExists(path) {
          checkedPaths.push(path)
          return fileSet.has(path)
        },
        async detectPackageManager() {
          return packageManager
        },
      }

      if (realpaths.length > 0) {
        adapter.realpath = async (path) => realpathMap.get(path) ?? path
      }

      return {
        checkedPaths,
        ctx: await WorkspaceContext.create('/repo', adapter),
      }
    }

    it('finds installed package manifests while walking toward the workspace root', async () => {
      const { checkedPaths, ctx } = await createInstallLookupFixture({
        files: [
          '/repo/node_modules/lodash/package.json',
        ],
      })

      await expect(ctx.findInstalledPackageManifestPath(
        '/repo/packages/app/package.json',
        'lodash',
      )).resolves.toBe('/repo/node_modules/lodash/package.json')
      expect(checkedPaths).toEqual([
        '/repo/packages/app/node_modules/lodash/package.json',
        '/repo/packages/node_modules/lodash/package.json',
        '/repo/node_modules/lodash/package.json',
      ])
    })

    it('finds scoped installed package manifests', async () => {
      const { checkedPaths, ctx } = await createInstallLookupFixture({
        files: [
          '/repo/packages/app/node_modules/@scope/pkg/package.json',
        ],
      })

      await expect(ctx.findInstalledPackageManifestPath(
        '/repo/packages/app/package.json',
        '@scope/pkg',
      )).resolves.toBe('/repo/packages/app/node_modules/@scope/pkg/package.json')
      expect(checkedPaths).toEqual([
        '/repo/packages/app/node_modules/@scope/pkg/package.json',
      ])
    })

    it('uses the real path of node_modules packages when resolving transitive dependencies', async () => {
      const { checkedPaths, ctx } = await createInstallLookupFixture({
        files: [
          '/repo/node_modules/.pnpm/foo@1.0.0/node_modules/bar/package.json',
        ],
        packageManager: 'pnpm',
        realpaths: [[
          '/repo/node_modules/foo/package.json',
          '/repo/node_modules/.pnpm/foo@1.0.0/node_modules/foo/package.json',
        ]],
      })

      checkedPaths.length = 0
      await expect(ctx.findInstalledPackageManifestPath(
        '/repo/node_modules/foo/package.json',
        'bar',
      )).resolves.toBe('/repo/node_modules/.pnpm/foo@1.0.0/node_modules/bar/package.json')
      expect(checkedPaths).toEqual([
        '/repo/node_modules/.pnpm/foo@1.0.0/node_modules/foo/node_modules/bar/package.json',
        '/repo/node_modules/.pnpm/foo@1.0.0/node_modules/bar/package.json',
      ])
    })

    it('keeps external symlink lookups on workspace-visible paths', async () => {
      const { checkedPaths, ctx } = await createInstallLookupFixture({
        files: [
          '/repo/node_modules/foo/node_modules/bar/package.json',
        ],
        realpaths: [[
          '/repo/node_modules/foo/package.json',
          '/linked/foo/package.json',
        ]],
      })

      await expect(ctx.findInstalledPackageManifestPath(
        '/repo/node_modules/foo/package.json',
        'bar',
      )).resolves.toBe('/repo/node_modules/foo/node_modules/bar/package.json')
      expect(checkedPaths).toEqual([
        '/repo/node_modules/foo/node_modules/bar/package.json',
      ])
    })

    it('ignores dependency names that cannot be package names', async () => {
      const { checkedPaths, ctx } = await createInstallLookupFixture({ files: [] })

      for (const packageName of ['../outside', '@/pkg']) {
        await expect(ctx.findInstalledPackageManifestPath(
          '/repo/package.json',
          packageName,
        )).resolves.toBeUndefined()
      }
      expect(checkedPaths).toEqual([])
    })
  })
})
