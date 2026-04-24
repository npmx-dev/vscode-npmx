import type { WorkspaceAdapter } from './workspace'
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
})
