import type { Connection, LanguageServer } from '@volar/language-server'
import type { DependencyInfo, PackageManager, WorkspaceAdapter } from 'npmx-language-core/workspace'
import type { IWorkspaceState } from 'npmx-language-service/types'
import type { GetPackageManagerRequest } from 'npmx-shared/protocol'
import { access, readFile } from 'node:fs/promises'
import { RequestType } from '@volar/language-server'
import {
  DEPENDENCY_FILE_GLOB,
  PACKAGE_JSON_BASENAME,
  PNPM_WORKSPACE_BASENAME,
  YARN_WORKSPACE_BASENAME,
} from 'npmx-language-core/constants'
import { isDependencyFile, isPackageManifest } from 'npmx-language-core/utils'
import { WorkspaceContext } from 'npmx-language-core/workspace'
import { GET_PACKAGE_MANAGER_METHOD } from 'npmx-shared/protocol'
import { defineCachedFunction } from 'ocache'
import { URI } from 'vscode-uri'

type EditorFlavor = ReturnType<IWorkspaceState['getEditorFlavor']>

const getPackageManagerRequestType = new RequestType<
  GetPackageManagerRequest.ParamsType,
  GetPackageManagerRequest.ResponseType,
  GetPackageManagerRequest.ErrorType
>(GET_PACKAGE_MANAGER_METHOD)

const PACKAGE_MANAGER_PATTERN = /^(bun|npm|pnpm|yarn)(?:@|$)/
const PACKAGE_MANAGER_LOCKFILES: [PackageManager, string[]][] = [
  ['bun', ['bun.lock', 'bun.lockb']],
  ['pnpm', ['pnpm-lock.yaml']],
  ['yarn', ['yarn.lock']],
  ['npm', ['package-lock.json', 'npm-shrinkwrap.json']],
]

function normalizePackageManager(value: string | undefined): PackageManager | undefined {
  if (!value)
    return

  const match = PACKAGE_MANAGER_PATTERN.exec(value.trim())
  const packageManager = match?.[1]
  switch (packageManager) {
    case 'bun':
    case 'npm':
    case 'pnpm':
    case 'yarn':
      return packageManager
  }
}

function isPackageManagerManifest(value: unknown): value is { packageManager?: string } {
  if (typeof value !== 'object' || value === null)
    return false

  return !('packageManager' in value) || typeof value.packageManager === 'string'
}

async function detectPackageManagerFromFiles(
  rootPath: string,
  adapter: Pick<WorkspaceAdapter, 'fileExists' | 'readFile'>,
): Promise<PackageManager> {
  const manifestPath = folderPath(rootPath, PACKAGE_JSON_BASENAME)
  if (await adapter.fileExists(manifestPath)) {
    try {
      const parsed = JSON.parse(await adapter.readFile(manifestPath))
      const packageManager = isPackageManagerManifest(parsed)
        ? normalizePackageManager(parsed.packageManager)
        : undefined
      if (packageManager)
        return packageManager
    } catch {
    }
  }

  for (const [packageManager, basenames] of PACKAGE_MANAGER_LOCKFILES) {
    for (const basename of basenames) {
      if (await adapter.fileExists(folderPath(rootPath, basename)))
        return packageManager
    }
  }

  if (await adapter.fileExists(folderPath(rootPath, PNPM_WORKSPACE_BASENAME)))
    return 'pnpm'

  if (await adapter.fileExists(folderPath(rootPath, YARN_WORKSPACE_BASENAME)))
    return 'yarn'

  return 'npm'
}

function folderPath(rootPath: string, basename: string) {
  return `${rootPath}/${basename}`
}

function createLanguageServerAdapter(folderUri: URI, connection: Connection, server: LanguageServer): WorkspaceAdapter {
  return {
    async readFile(path: string): Promise<string> {
      const uri = folderUri.with({ path })
      const doc = server.documents.get(uri)
      if (doc)
        return doc.getText()

      return await readFile(uri.fsPath, 'utf-8')
    },

    async fileExists(path: string): Promise<boolean> {
      try {
        await access(folderUri.with({ path }).fsPath)
        return true
      } catch {
        return false
      }
    },

    async detectPackageManager(rootPath): Promise<PackageManager> {
      const detected = await detectPackageManagerFromFiles(rootPath, this)

      try {
        const result = await connection.sendRequest(getPackageManagerRequestType, {
          uri: rootPath,
        })
        return result || detected
      } catch {
        return detected
      }
    },
  }
}

export class WorkspaceState implements IWorkspaceState {
  #connection: Connection
  #server: LanguageServer
  #editorFlavor: EditorFlavor = 'unknown'

  constructor(connection: Connection, server: LanguageServer) {
    this.#connection = connection
    this.#server = server
    this.#registerEventListeners()
  }

  #registerEventListeners() {
    this.#server.onInitialized(() => {
      this.#server.fileWatcher.watchFiles([DEPENDENCY_FILE_GLOB])
    })

    this.#server.workspaceFolders.onDidChange(({ removed }) => {
      for (const folder of removed) {
        const folderUri = URI.parse(folder.uri)
        this.#cachedFolderPaths.delete(folderUri.path)
        this.#getWorkspaceContextByFolder.invalidate(folderUri)
      }
    })

    this.#server.fileWatcher.onDidChangeWatchedFiles(({ changes }) => {
      for (const change of changes) {
        const uri = URI.parse(change.uri)
        if (isDependencyFile(uri.path))
          this.#invalidateDependencyCacheByUri(uri)
      }
    })
  }

  setEditorFlavor(editorFlavor: EditorFlavor) {
    this.#editorFlavor = editorFlavor
  }

  getEditorFlavor(): EditorFlavor {
    return this.#editorFlavor
  }

  async #invalidateDependencyCacheByUri(uri: URI) {
    const folderUri = this.#getWorkspaceFolderUri(uri.toString())
    if (!folderUri || !this.#cachedFolderPaths.has(folderUri.path))
      return

    const ctx = await this.#getWorkspaceContextByFolder(folderUri)
    if (!ctx)
      return

    await ctx.invalidateDependencyInfo(uri.path)
    this.#connection.console.info(`[workspace-context] invalidate dependencies cache: ${uri.path}`)

    const isRoot = uri.path === `${ctx.rootPath}/${PACKAGE_JSON_BASENAME}`
    if (isRoot || ctx.isWorkspaceFile(uri.path))
      await ctx.loadWorkspace()
  }

  #cachedFolderPaths = new Set<string>()

  #getWorkspaceContextByFolder = defineCachedFunction<
    WorkspaceContext | undefined,
    [URI]
  >(
    async (folderUri) => {
      const ctx = await WorkspaceContext.create(
        folderUri.path,
        createLanguageServerAdapter(folderUri, this.#connection, this.#server),
      )
      this.#cachedFolderPaths.add(folderUri.path)

      this.#connection.console.info(`[workspace-context] built for ${folderUri}, packageManager: ${ctx.packageManager}`)
      return ctx
    },
    {
      name: 'workspace-context',
      getKey: (folderUri) => folderUri.path,
      maxAge: -1,
      swr: false,
      staleMaxAge: 0,
    },
  )

  #getWorkspaceFolderUri(uriString: string): URI | undefined {
    const uri = URI.parse(uriString)
    const uriPath = uri.path

    let bestMatch: URI | undefined
    let bestLength = 0

    for (const folderUri of this.#server.workspaceFolders.all) {
      const folderPath = folderUri.path.endsWith('/') ? folderUri.path : `${folderUri.path}/`
      if (uriPath.startsWith(folderPath) && folderPath.length > bestLength) {
        bestMatch = folderUri
        bestLength = folderPath.length
      }
    }

    return bestMatch
  }

  async getWorkspaceContext(uriString: string): Promise<WorkspaceContext | undefined> {
    const folderUri = this.#getWorkspaceFolderUri(uriString)
    if (!folderUri)
      return

    return await this.#getWorkspaceContextByFolder(folderUri)
  }

  async getResolvedDependencies(uriString: string): Promise<DependencyInfo[] | undefined> {
    const ctx = await this.getWorkspaceContext(uriString)
    if (!ctx)
      return

    const uri = URI.parse(uriString)

    const depPromises: Promise<DependencyInfo[]>[] = []
    if (isPackageManifest(uri.path)) {
      depPromises.push(ctx.loadPackageManifestInfo(uri.path).then((info) => info?.dependencies ?? []))
    }
    if (ctx.isWorkspaceFile(uri.path)) {
      depPromises.push(ctx.loadWorkspaceFileInfo(uri.path).then((info) => info?.dependencies ?? []))
    }

    if (!depPromises.length)
      return

    const results = await Promise.all(depPromises)
    return results.flat()
  }

  async getResolvedDependenciesForContainingPackage(uriString: string): Promise<DependencyInfo[] | undefined> {
    const ctx = await this.getWorkspaceContext(uriString)
    if (!ctx)
      return

    const uri = URI.parse(uriString)
    if (uri.scheme !== 'file')
      return

    const manifestPath = await ctx.findNearestPackageManifestPath(uri.path)
    if (!manifestPath)
      return

    return (await ctx.loadPackageManifestInfo(manifestPath))?.dependencies
  }
}

export function createWorkspaceState(connection: Connection, server: LanguageServer) {
  return new WorkspaceState(connection, server)
}
