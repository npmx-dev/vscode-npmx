import type { DependencyInfo, WorkspaceAdapter } from 'npmx-language-core/workspace'
import type { IWorkspaceState } from '../types'
import { WorkspaceContext } from 'npmx-language-core/workspace'
import { describe, expect, it } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { createDependencyInfo } from '../test-utils/dependency'
import { DEFAULT_CLIENT_FEATURES } from '../types'
import { provideInstalledPackageDefinition } from './installed-package-definition'

async function createWorkspaceState(
  files: string[],
  dependencies: DependencyInfo[],
): Promise<IWorkspaceState> {
  const fileSet = new Set(files)
  const adapter: WorkspaceAdapter = {
    async readFile() {
      throw new Error('this test should not read files through the adapter')
    },
    async fileExists(path) {
      return fileSet.has(path)
    },
    async detectPackageManager() {
      return 'npm'
    },
  }
  const workspaceContext = await WorkspaceContext.create('/repo', adapter)

  return {
    async findCatalogDependency() {
      return undefined
    },
    async findInstalledPackageManifestPath(uri, packageName) {
      return workspaceContext.findInstalledPackageManifestPath(URI.parse(uri).path, packageName)
    },
    async getCatalogs() {
      return undefined
    },
    getClientFeatures: () => DEFAULT_CLIENT_FEATURES,
    async getPackageEngines() {
      return undefined
    },
    async getWorkspaceContext() {
      return workspaceContext
    },
    async getResolvedDependencies() {
      return dependencies
    },
    async getResolvedDependenciesForContainingPackage() {
      return undefined
    },
  }
}

describe('provideInstalledPackageDefinition', () => {
  it('links dependency names to installed package manifests', async () => {
    const sourceText = `{
  "dependencies": {
    "lodash": "^1.0.0"
  }
}
`
    const sourceDocument = TextDocument.create(
      'file:///repo/package.json',
      'json',
      0,
      sourceText,
    )
    const nameStart = sourceText.indexOf('lodash')
    const nameEnd = nameStart + 'lodash'.length
    const specStart = sourceText.indexOf('^1.0.0')
    const specEnd = specStart + '^1.0.0'.length
    const workspaceState = await createWorkspaceState(
      ['/repo/node_modules/lodash/package.json'],
      [createDependencyInfo({
        nameRange: [nameStart, nameEnd],
        specRange: [specStart, specEnd],
      })],
    )

    await expect(provideInstalledPackageDefinition(
      sourceDocument,
      sourceDocument.positionAt(nameStart),
      workspaceState,
    )).resolves.toEqual([{
      targetUri: 'file:///repo/node_modules/lodash/package.json',
      targetRange: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
      targetSelectionRange: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
      originSelectionRange: {
        start: sourceDocument.positionAt(nameStart),
        end: sourceDocument.positionAt(nameEnd),
      },
    }])
  })

  it('does not handle dependency specs', async () => {
    const sourceText = '{"dependencies":{"lodash":"^1.0.0"}}'
    const sourceDocument = TextDocument.create(
      'file:///repo/package.json',
      'json',
      0,
      sourceText,
    )
    const nameStart = sourceText.indexOf('lodash')
    const nameEnd = nameStart + 'lodash'.length
    const specStart = sourceText.indexOf('^1.0.0')
    const workspaceState = await createWorkspaceState(
      ['/repo/node_modules/lodash/package.json'],
      [createDependencyInfo({
        nameRange: [nameStart, nameEnd],
        specRange: [specStart, specStart + '^1.0.0'.length],
      })],
    )

    await expect(provideInstalledPackageDefinition(
      sourceDocument,
      sourceDocument.positionAt(specStart),
      workspaceState,
    )).resolves.toBeUndefined()
  })
})
