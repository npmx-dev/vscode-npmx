import { join } from 'node:path'
import { createTextDocument } from 'jest-mock-vscode'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Uri, workspace } from 'vscode'
import { packageManifestExtractorEntry } from '../../src/extractors'
import { detectPackageManager, readWorkspaceCatalogs } from '../../src/utils/package-manager'

const FIXTURES_ROOT = join(process.cwd(), 'tests/fixtures/workspace')

function getFixtureRoot(name: string) {
  return join(FIXTURES_ROOT, name)
}

function createWorkspaceFolder(root: string) {
  return {
    uri: Uri.file(root),
    name: 'workspace',
    index: 0,
  }
}

function resetWorkspaceState() {
  ;(workspace.textDocuments as any) = []
  ;(workspace as any).setWorkspaceFolders([])
}

describe('package manager', () => {
  beforeEach(() => {
    resetWorkspaceState()
  })

  afterEach(() => {
    resetWorkspaceState()
  })

  it.each([
    ['prefers packageManager in root package.json over workspace files', 'package-manager-npm', 'npm'],
    ['falls back to pnpm workspace file', 'package-manager-pnpm', 'pnpm'],
    ['falls back to yarn workspace file', 'package-manager-yarn', 'yarn'],
  ] as const)('%s', async (_, fixtureName, expected) => {
    const root = getFixtureRoot(fixtureName)
    const folder = createWorkspaceFolder(root)
    const packageManager = await detectPackageManager(folder as any)

    expect(packageManager).toBe(expected)
  })

  it('prefers open dirty root package.json over disk contents', async () => {
    const root = getFixtureRoot('package-manager-yarn')
    const rootPackageUri = Uri.file(join(root, packageManifestExtractorEntry.basename))
    const dirtyDocument = createTextDocument(rootPackageUri, JSON.stringify({
      name: 'repo',
      version: '1.0.0',
      packageManager: 'pnpm@10.30.3',
    }, null, 2), 'json', 2)
    ;(workspace.textDocuments as any) = [dirtyDocument]

    const packageManager = await detectPackageManager(createWorkspaceFolder(root) as any)

    expect(packageManager).toBe('pnpm')
  })

  it('reads catalogs from fixture workspace config files', async () => {
    const root = getFixtureRoot('pnpm-workspace')
    const catalogs = await readWorkspaceCatalogs(
      createWorkspaceFolder(root) as any,
      'pnpm',
    )

    expect(catalogs).toEqual({
      default: {
        lodash: '^4.17.21',
      },
      dev: {
        vite: 'npm:vite@latest',
      },
    })
  })

  it('returns undefined catalogs for npm workspaces', async () => {
    const root = getFixtureRoot('package-manager-npm')
    const catalogs = await readWorkspaceCatalogs(
      createWorkspaceFolder(root) as any,
      'npm',
    )

    expect(catalogs).toBeUndefined()
  })
})
