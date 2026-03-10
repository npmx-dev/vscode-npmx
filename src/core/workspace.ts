import type { CatalogsInfo, PackageManager, ResolvedDependencyInfo } from '#types/context'
import type { DependencyInfo, PackageManifestInfo, WorkspaceCatalogInfo } from '#types/extractor'
import type { MemoizeOptions } from '#utils/memoize'
import type { WorkspaceFolder } from 'vscode'
import { logger } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { isOffsetInRange } from '#utils/ast'
import { resolveDependencySpec } from '#utils/dependency'
import { getDocumentText, isPackageManifestPath, isWorkspaceFilePath } from '#utils/file'
import { memoize } from '#utils/memoize'
import { resolveExactVersion } from '#utils/package'
import { detectPackageManager, workspaceFileMapping } from '#utils/package-manager'
import { lazyInit } from '#utils/shared'
import { Uri, workspace } from 'vscode'
import { accessOk } from 'vscode-find-up'
import { getExtractor } from './extractors'

type WithResolvedDependencyInfo<T> = Omit<T, 'dependencies'> & {
  dependencies: ResolvedDependencyInfo[]
}

class WorkspaceContext {
  folder: WorkspaceFolder
  packageManager: PackageManager = 'npm'
  #catalogs?: PromiseWithResolvers<CatalogsInfo | undefined>

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
    this.packageManager = await detectPackageManager(this.folder)

    logger.info(`[workspace-context] detect package manager: ${this.packageManager}`)

    if (this.packageManager !== 'npm') {
      this.#catalogs = Promise.withResolvers()
      const workspaceFilename = workspaceFileMapping[this.packageManager]
      const workspaceFile = Uri.joinPath(this.folder.uri, workspaceFilename)
      this.#catalogs.resolve(
        await accessOk(workspaceFile)
          ? (await this.loadWorkspaceCatalogInfo(workspaceFile))?.catalogs
          : undefined,
      )
    }
  }

  #memoizeOptions: MemoizeOptions<Uri> = {
    getKey: (uri) => uri.path,
    ttl: false,
    maxSize: Number.POSITIVE_INFINITY,
    fallbackToCachedOnError: false,
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

  loadPackageManifestInfo = memoize<
    Uri,
    Promise<WithResolvedDependencyInfo<PackageManifestInfo> | undefined>
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
      this.#catalogs!.promise,
    ])

    if (!info)
      return

    return {
      ...info,
      dependencies: info.dependencies.map((dep) => this.#createResolvedDependencyInfo(dep, catalogs)),
    }
  }, this.#memoizeOptions)

  loadWorkspaceCatalogInfo = memoize<
    Uri,
    Promise<WithResolvedDependencyInfo<WorkspaceCatalogInfo> | undefined>
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
  }, this.#memoizeOptions)
}

const getWorkspaceContextByFolder = memoize<WorkspaceFolder, Promise<WorkspaceContext | undefined>>(async (folder) => {
  logger.info(`[workspace-context] built ${folder.uri.path}`)
  return await WorkspaceContext.create(folder)
}, {
  getKey: (folder) => folder.uri.path,
  ttl: false,
  fallbackToCachedOnError: false,
})

export function deleteWorkspaceContextCache(folder: WorkspaceFolder) {
  getWorkspaceContextByFolder.delete(folder)
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
