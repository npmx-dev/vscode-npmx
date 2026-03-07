import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createTextDocument } from 'jest-mock-vscode'
import { normalize } from 'pathe'
import { describe, expect, it } from 'vitest'
import { Uri } from 'vscode'
import { packageManifestExtractorEntry } from '../../src/extractors'
import { detectPackageManager, readWorkspaceCatalogs } from '../../src/utils/package-manager'

const FIXTURES_ROOT = join(process.cwd(), 'tests/fixtures/workspace-context')

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

async function readDocumentText(uri: Uri, openDocuments: Map<string, ReturnType<typeof createTextDocument>>): Promise<string | undefined> {
  const openDocument = openDocuments.get(normalize(uri.path))
  if (openDocument)
    return openDocument.getText()

  try {
    return await readFile(uri.fsPath, 'utf8')
  } catch {}
}

async function readExtractorRoot<T>(
  uri: Uri,
  extractor: { parse: (text: string) => T | null | undefined },
  openDocuments: Map<string, ReturnType<typeof createTextDocument>>,
): Promise<T | undefined> {
  const text = await readDocumentText(uri, openDocuments)
  if (!text)
    return

  return extractor.parse(text) ?? undefined
}

describe('package manager', () => {
  it.each([
    ['prefers packageManager in root package.json over workspace files', 'package-manager-npm', 'npm'],
    ['falls back to pnpm workspace file', 'package-manager-pnpm', 'pnpm'],
    ['falls back to yarn workspace file', 'package-manager-yarn', 'yarn'],
  ] as const)('%s', async (_, fixtureName, expected) => {
    const root = getFixtureRoot(fixtureName)
    const folder = createWorkspaceFolder(root)

    const packageManager = await detectPackageManager(
      folder as any,
      new Map(),
      readDocumentText,
      readExtractorRoot,
    )

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

    const packageManager = await detectPackageManager(
      createWorkspaceFolder(root) as any,
      new Map([[normalize(rootPackageUri.path), dirtyDocument]]),
      readDocumentText,
      readExtractorRoot,
    )

    expect(packageManager).toBe('pnpm')
  })

  it('reads catalogs from fixture workspace config files', async () => {
    const root = getFixtureRoot('pnpm-workspace')
    const catalogs = await readWorkspaceCatalogs(
      createWorkspaceFolder(root) as any,
      'pnpm',
      new Map(),
      readExtractorRoot,
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
      new Map(),
      readExtractorRoot,
    )

    expect(catalogs).toBeUndefined()
  })
})
