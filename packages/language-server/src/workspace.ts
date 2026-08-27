import type { Connection, LanguageServer } from '@volar/language-server'
import type { CatalogsInfo, Engines } from 'npmx-language-core/types'
import type { DependencyInfo, PackageManager, WorkspaceAdapter } from 'npmx-language-core/workspace'
import type { ClientFeatures, IWorkspaceState } from 'npmx-language-service/types'
import { access, realpath as fsRealpath, readFile } from 'node:fs/promises'
import { CACHE_MAX_AGE_MAXIMUM, DEPENDENCY_FILE_GLOB, PACKAGE_JSON_BASENAME } from 'npmx-language-core/constants'
import { isDependencyFile, isPackageManifest, normalizeCatalogName } from 'npmx-language-core/utils'
import { WorkspaceContext } from 'npmx-language-core/workspace'
import { DEFAULT_CLIENT_FEATURES } from 'npmx-language-service/types'
import { defineCachedFunction } from 'ocache'
import { detect } from 'package-manager-detector/detect'
import { URI } from 'vscode-uri'

/**
 * Exported for unit tests only.
 * @internal
 */
export async function detectPackageManagerFromProject(rootPath: string): Promise<PackageManager> {
  // `rootPath` is a URI path (posix-style) coming from `WorkspaceContext`,
  // but `detect()` reads the filesystem and requires a platform-native path.
  const fsPath = URI.file(rootPath).fsPath
  const result = await detect({
    cwd: fsPath,
    stopDir: fsPath,
  })

  switch (result?.name) {
    case 'bun':
    case 'npm':
    case 'pnpm':
    case 'yarn':
      return result.name
    default:
      return 'npm'
  }
}

function createLanguageServerAdapter(folderUri: URI, server: LanguageServer): WorkspaceAdapter {
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

    async realpath(path: string): Promise<string> {
      return URI.file(await fsRealpath(folderUri.with({ path }).fsPath)).path
    },

    detectPackageManager: detectPackageManagerFromProject,
  }
}

export class WorkspaceState implements IWorkspaceState {
  #connection: Connection
  #server: LanguageServer
  #clientFeatures: ClientFeatures = DEFAULT_CLIENT_FEATURES

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

  setClientFeatures(clientFeatures: ClientFeatures) {
    this.#clientFeatures = clientFeatures
  }

  getClientFeatures(): ClientFeatures {
    return this.#clientFeatures
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
        createLanguageServerAdapter(folderUri, this.#server),
      )
      this.#cachedFolderPaths.add(folderUri.path)

      this.#connection.console.info(`[workspace-context] built for ${folderUri}, packageManager: ${ctx.packageManager}`)
      return ctx
    },
    {
      name: 'workspace-context',
      getKey: (folderUri) => folderUri.path,
      maxAge: CACHE_MAX_AGE_MAXIMUM,
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

  async findCatalogDependency(uriString: string, dependency: DependencyInfo) {
    const ctx = await this.getWorkspaceContext(uriString)
    if (!ctx?.workspaceFilePath)
      return

    const workspaceFileInfo = await ctx.loadWorkspaceFileInfo(ctx.workspaceFilePath)
    const targetDependency = workspaceFileInfo?.dependencies.find((candidate) =>
      candidate.rawName === dependency.resolvedName
      && candidate.categoryName != null
      && dependency.categoryName != null
      && normalizeCatalogName(candidate.categoryName) === normalizeCatalogName(dependency.categoryName),
    )
    if (!targetDependency)
      return

    return { dependency: targetDependency, path: ctx.workspaceFilePath }
  }

  async findInstalledPackageManifestPath(uriString: string, packageName: string): Promise<string | undefined> {
    const ctx = await this.getWorkspaceContext(uriString)
    if (!ctx)
      return

    const uri = URI.parse(uriString)
    if (uri.scheme !== 'file' || !isPackageManifest(uri.path))
      return

    return ctx.findInstalledPackageManifestPath(uri.path, packageName)
  }

  async getCatalogs(uriString: string): Promise<CatalogsInfo | undefined> {
    return (await this.getWorkspaceContext(uriString))?.getCatalogs()
  }

  async getPackageEngines(uriString: string): Promise<Engines | undefined> {
    const ctx = await this.getWorkspaceContext(uriString)
    if (!ctx)
      return

    const uri = URI.parse(uriString)
    if (uri.scheme !== 'file' || !isPackageManifest(uri.path))
      return

    return (await ctx.loadPackageManifestInfo(uri.path))?.engines
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
