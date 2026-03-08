import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createTextDocument } from 'jest-mock-vscode'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Uri, workspace } from 'vscode'
import { deleteWorkspaceContextState, getResolvedDependencies, getResolvedDependencyByOffset } from '../../src/utils/workspace'

const FIXTURES_ROOT = join(process.cwd(), 'tests/fixtures/workspace')
const FIXTURE_NAMES = [
  'pnpm-workspace',
  'package-manager-npm',
  'package-manager-pnpm',
  'package-manager-yarn',
  'dirty-doc',
  'minimal',
]

function getFixtureRoot(name: (typeof FIXTURE_NAMES)[number]) {
  return join(FIXTURES_ROOT, name)
}

function setWorkspaceRoot(root: string) {
  ;(workspace as any).setWorkspaceFolders([
    {
      uri: Uri.file(root),
      name: 'workspace',
      index: 0,
    },
  ])
}

async function listFixturePackageFiles(root: string, currentDir = root): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const absolutePath = join(currentDir, entry.name)
    if (entry.isDirectory())
      return listFixturePackageFiles(root, absolutePath)

    if (entry.isFile() && entry.name === 'package.json')
      return [absolutePath]

    return []
  }))

  return files.flat()
}

async function setFixturePackageFiles(root: string) {
  const packageFiles = await listFixturePackageFiles(root)
  vi.mocked(workspace.findFiles).mockResolvedValue(packageFiles.map((file) => Uri.file(file)))
}

function resetWorkspaceState() {
  vi.mocked(workspace.findFiles).mockReset()
  ;(workspace.textDocuments as any) = []
  ;(workspace as any).setWorkspaceFolders([])
}

describe('workspace context', () => {
  beforeEach(() => {
    resetWorkspaceState()
  })

  afterEach(() => {
    FIXTURE_NAMES.forEach((fixtureName) => {
      deleteWorkspaceContextState(getFixtureRoot(fixtureName))
    })
    resetWorkspaceState()
  })

  it('builds package contexts on demand and resolves catalogs without scanning the workspace', async () => {
    const root = getFixtureRoot('pnpm-workspace')
    setWorkspaceRoot(root)
    await setFixturePackageFiles(root)

    const workspaceContext = await getWorkspaceContext(Uri.file(join(root, 'packages/app/package.json')))
    expect(workspaceContext?.packageManager).toBe('pnpm')
    expect(workspaceContext?.catalogs).toEqual({
      default: {
        lodash: '^4.17.21',
      },
      dev: {
        vite: 'npm:vite@latest',
      },
    })
    const appContext = await getPackageContext(Uri.file(join(root, 'packages/app/package.json')))
    expect(appContext).toBeDefined()

    const dependencies = [...appContext!.dependencies.values()]
    expect(dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rawName: 'lodash',
          protocol: 'catalog',
          resolvedName: 'lodash',
          resolvedSpec: '^4.17.21',
        }),
        expect.objectContaining({
          rawName: 'vite',
          protocol: 'catalog',
          resolvedName: 'vite',
          resolvedSpec: 'latest',
        }),
        expect.objectContaining({
          rawName: 'pkg-core',
          protocol: 'workspace',
          resolvedName: 'pkg-core',
          resolvedSpec: '*',
        }),
        expect.objectContaining({
          rawName: 'my-nuxt',
          protocol: 'npm',
          resolvedName: 'nuxt',
          resolvedSpec: 'latest',
        }),
        expect.objectContaining({
          rawName: '@deno/doc',
          protocol: 'jsr',
          resolvedName: '@deno/doc',
          resolvedSpec: '^0.189.1',
        }),
      ]),
    )

    const rootPackageContext = await getPackageContext(Uri.file(join(root, 'pnpm-workspace.yaml')))
    expect(rootPackageContext?.packageJsonPath).toBe(join(root, 'package.json'))
  })

  it('collects resolved dependencies for workspace catalog documents', async () => {
    const root = getFixtureRoot('pnpm-workspace')
    setWorkspaceRoot(root)
    await setFixturePackageFiles(root)

    const dependencies = await getResolvedDependencies(Uri.file(join(root, 'pnpm-workspace.yaml')))
    expect(dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'catalog',
          rawName: 'lodash',
          rawSpec: '^4.17.21',
          protocol: null,
          resolvedName: 'lodash',
          resolvedSpec: '^4.17.21',
          resolvedProtocol: 'npm',
        }),
        expect.objectContaining({
          category: 'catalogs',
          rawName: 'vite',
          rawSpec: 'npm:vite@latest',
          protocol: 'npm',
          categoryName: 'dev',
          resolvedName: 'vite',
          resolvedSpec: 'latest',
        }),
      ]),
    )
  })

  it.each([
    ['prefers packageManager in root package.json over workspace files', 'package-manager-npm', 'npm'],
    ['falls back to pnpm workspace file', 'package-manager-pnpm', 'pnpm'],
    ['falls back to yarn workspace file', 'package-manager-yarn', 'yarn'],
  ] as const)('%s', async (_, fixtureName, expected) => {
    const root = getFixtureRoot(fixtureName)
    setWorkspaceRoot(root)
    await setFixturePackageFiles(root)

    const workspaceContext = await getWorkspaceContext(Uri.file(join(root, 'package.json')))
    expect(workspaceContext?.packageManager).toBe(expected)
  })

  it('prefers open dirty documents over disk contents', async () => {
    const root = getFixtureRoot('dirty-doc')
    setWorkspaceRoot(root)
    await setFixturePackageFiles(root)

    const appPackageJsonUri = Uri.file(join(root, 'packages/app/package.json'))
    const dirtyDocument = createTextDocument(appPackageJsonUri, JSON.stringify({
      name: 'app',
      version: '0.1.0',
      dependencies: {
        vite: '^6.0.0',
      },
    }, null, 2), 'json', 2)
    ;(dirtyDocument as any)._isDirty = true
    ;(workspace.textDocuments as any) = [dirtyDocument]

    const appContext = await getPackageContext(appPackageJsonUri)
    expect([...appContext!.dependencies.values()]).toEqual([
      expect.objectContaining({
        rawName: 'vite',
        rawSpec: '^6.0.0',
        resolvedSpec: '^6.0.0',
      }),
    ])
  })

  it('does not scan workspace packages during initialization', async () => {
    const root = getFixtureRoot('minimal')
    setWorkspaceRoot(root)

    const target = Uri.file(join(root, 'package.json'))
    await getWorkspaceContext(target)

    expect(workspace.findFiles).not.toHaveBeenCalled()
  })

  it('finds resolved dependencies by offset across supported documents', async () => {
    const root = getFixtureRoot('pnpm-workspace')
    setWorkspaceRoot(root)
    await setFixturePackageFiles(root)

    const appPackageJsonPath = join(root, 'packages/app/package.json')
    const appPackageJsonText = await readFile(appPackageJsonPath, 'utf8')
    const packageDependency = await getResolvedDependencyByOffset(
      Uri.file(appPackageJsonPath),
      appPackageJsonText.indexOf('"pkg-core"') + 2,
    )

    expect(packageDependency).toMatchObject({
      rawName: 'pkg-core',
      protocol: 'workspace',
      resolvedName: 'pkg-core',
      resolvedSpec: '*',
    })

    const workspaceYamlPath = join(root, 'pnpm-workspace.yaml')
    const workspaceYamlText = await readFile(workspaceYamlPath, 'utf8')
    const catalogDependency = await getResolvedDependencyByOffset(
      Uri.file(workspaceYamlPath),
      workspaceYamlText.indexOf('npm:vite@latest') + 1,
    )

    expect(catalogDependency).toMatchObject({
      category: 'catalogs',
      rawName: 'vite',
      rawSpec: 'npm:vite@latest',
      categoryName: 'dev',
    })
  })
})
