import type { CatalogsInfo, PackageManager, ResolvedDependencyInfo } from '#types/context'
import type { DependencyInfo, PackageManifestInfo, WorkspaceCatalogInfo } from '#types/extractor'
import type { CacheOptions } from 'ocache'
import type { WorkspaceFolder } from 'vscode'
import { getPackageInfo } from '#api/package'
import { PNPM_WORKSPACE_BASENAME, YARN_WORKSPACE_BASENAME } from '#constants'
import { logger } from '#state'
import { isOffsetInRange } from '#utils/ast'
import { resolveDependencySpec } from '#utils/dependency'
import { getDocumentText, isPackageManifestPath, isWorkspaceFilePath } from '#utils/file'
import { resolveExactVersion } from '#utils/package'
import { lazyInit } from '#utils/shared'
import { defineCachedFunction } from 'ocache'
import { commands, Uri, window, workspace } from 'vscode'
import { accessOk } from 'vscode-find-up'
import { getExtractor } from './extractors'

type WithResolvedDependencyInfo<T> = Omit<T, 'dependencies'> & {
  dependencies: ResolvedDependencyInfo[]
}

export const workspaceFileMapping: Record<Exclude<PackageManager, 'npm'>, string> = {
  pnpm: PNPM_WORKSPACE_BASENAME,
  yarn: YARN_WORKSPACE_BASENAME,
}

async function getPackageManager(uri: Uri): Promise<PackageManager> {
  try {
    const result = await commands.executeCommand<PackageManager>('npm.packageManager', uri)
    return result || 'npm'
  } catch (error) {
    console.error('Error getting package manager:', error)
    window.showErrorMessage('Failed to detect package manager. Defaulting to npm.')
    return 'npm'
  }
}

class WorkspaceContext {
  folder: WorkspaceFolder
  packageManager: PackageManager = 'npm'
  workspaceFileUri?: Uri
  #catalogs?: PromiseWithResolvers<CatalogsInfo | undefined>
  #invalidatedPaths = new Set<string>()

  private constructor(folder: WorkspaceFolder) {
    this.folder = folder
  }

  static async create(folder: WorkspaceFolder): Promise<WorkspaceContext> {
    const ctx = new WorkspaceContext(folder)
    await ctx.loadWorkspace()

    return ctx
  }

  async loadWorkspace() {
    this.#catalogs = undefined
    this.packageManager = await getPackageManager(this.folder.uri)

    logger.info(`[workspace-context] detect package manager: ${this.packageManager}`)

    if (this.packageManager !== 'npm') {
      this.#catalogs = Promise.withResolvers()
      const workspaceFilename = workspaceFileMapping[this.packageManager]
      this.workspaceFileUri = Uri.joinPath(this.folder.uri, workspaceFilename)
      this.#catalogs.resolve(
        await accessOk(this.workspaceFileUri)
          ? (await this.loadWorkspaceCatalogInfo(this.workspaceFileUri))?.catalogs
          : undefined,
      )
    }
  }

  #cacheOptions: CacheOptions<any, [Uri]> = {
    getKey: (uri) => uri.path,
    maxAge: 0,
    swr: false,
    staleMaxAge: 0,
    shouldInvalidateCache: (uri) => this.#invalidatedPaths.delete(uri.path),
  }

  invalidateDependencyInfo(uri: Uri) {
    const path = uri.path
    this.#invalidatedPaths.add(path)
  }

  async getCatalogs(): Promise<CatalogsInfo | undefined> {
    return this.#catalogs?.promise
  }

  #createResolvedDependencyInfo(dependency: DependencyInfo, catalogs?: CatalogsInfo): ResolvedDependencyInfo {
    const resolution = resolveDependencySpec(dependency.rawName, dependency.rawSpec, catalogs)

    const packageInfo = lazyInit(
      async () => resolution.resolvedProtocol === 'npm'
        ? await getPackageInfo(resolution.resolvedName) ?? null
        : null,
    )

    return {
      ...dependency,
      ...resolution,
      categoryName: dependency.categoryName ?? resolution.categoryName,
      packageInfo,
      resolvedVersion: lazyInit(async () => {
        if (resolution.resolvedProtocol !== 'npm')
          return null

        const pkg = await packageInfo()
        if (!pkg)
          return null

        return resolveExactVersion(pkg, resolution.resolvedSpec)
      }),
    }
  }

  loadPackageManifestInfo = defineCachedFunction<
    WithResolvedDependencyInfo<PackageManifestInfo> | undefined,
    [Uri]
  >(async (uri) => {
    const path = uri.path
    if (!isPackageManifestPath(path))
      return

    logger.info(`[workspace-context] load package manifest info: ${path}`)

    const extractor = getExtractor(path)
    if (!extractor)
      return

    const [info, catalogs] = await Promise.all([
      getDocumentText(uri).then((text) => extractor.getPackageManifestInfo(text)),
      this.#catalogs?.promise,
    ])

    if (!info)
      return

    return {
      ...info,
      dependencies: info.dependencies.map((dep) => this.#createResolvedDependencyInfo(dep, catalogs)),
    }
  }, this.#cacheOptions)

  loadWorkspaceCatalogInfo = defineCachedFunction<
    WithResolvedDependencyInfo<WorkspaceCatalogInfo> | undefined,
    [Uri]
  >(async (uri) => {
    const path = uri.path
    if (!isWorkspaceFilePath(path))
      return
    logger.info(`[workspace-context] load workspace catalog info: ${path}`)

    const extractor = getExtractor(path)
    if (!extractor)
      return

    const text = await getDocumentText(uri)
    const info = extractor.getWorkspaceCatalogInfo(text)

    if (!info)
      return

    return {
      ...info,
      dependencies: info.dependencies.map((dep) => this.#createResolvedDependencyInfo(dep)),
    }
  }, this.#cacheOptions)
}

const invalidatedFolderPaths = new Set<string>()

const getWorkspaceContextByFolder = defineCachedFunction<
  WorkspaceContext | undefined,
  [WorkspaceFolder]
> (async (folder) => {
  logger.info(`[workspace-context] built ${folder.uri.path}`)
  return await WorkspaceContext.create(folder)
}, {
  name: 'workspace-context',
  getKey: (folder) => folder.uri.path,
  swr: false,
  maxAge: 0,
  staleMaxAge: 0,
  shouldInvalidateCache: (folder) => invalidatedFolderPaths.delete(folder.uri.path),
})

export function deleteWorkspaceContextCache(folder: WorkspaceFolder) {
  invalidatedFolderPaths.add(folder.uri.path)
}

export async function getWorkspaceContext(uri: Uri) {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  return await getWorkspaceContextByFolder(folder)
}

export async function getResolvedDependencies(uri: Uri): Promise<ResolvedDependencyInfo[] | undefined> {
  const ctx = await getWorkspaceContext(uri)
  if (!ctx)
    return

  return (
    isPackageManifestPath(uri.path)
      ? await ctx.loadPackageManifestInfo(uri)
      : await ctx.loadWorkspaceCatalogInfo(uri)
  )?.dependencies
}

export async function getResolvedDependencyByOffset(uri: Uri, offset: number): Promise<ResolvedDependencyInfo | undefined> {
  const dependencies = await getResolvedDependencies(uri)

  return dependencies?.find((dependency) => isOffsetInRange(offset, dependency.nameRange) || isOffsetInRange(offset, dependency.specRange))
}
