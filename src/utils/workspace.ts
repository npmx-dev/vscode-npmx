import type { CatalogsInfo, PackageManager, ResolvedDependencyInfo } from '#types/context'
import type { DependencyInfo, PackageManifestInfo, WorkspaceCatalogInfo } from '#types/extractor'
import type { MemoizeOptions } from '#utils/memoize'
import type { WorkspaceFolder } from 'vscode'
import { getExtractor } from '#extractors'
import { logger } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { isOffsetInRange } from '#utils/ast'
import { resolveDependencySpec } from '#utils/dependency'
import { memoize } from '#utils/memoize'
import { resolveExactVersion } from '#utils/package'
import { detectPackageManager, workspaceFileMapping } from '#utils/package-manager'
import { Uri, workspace } from 'vscode'
import { accessOk } from 'vscode-find-up'
import { getDocumentText, isPackageManifestPath, isWorkspaceFilePath } from './file'
import { lazyInit } from './shared'

type WithResolvedDependencyInfo<T> = Omit<T, 'dependencies'> & {
  dependencies: ResolvedDependencyInfo[]
}

class WorkspaceContext {
  folder: WorkspaceFolder
  packageManager: PackageManager = 'npm'
  catalogs?: CatalogsInfo

  private constructor(folder: WorkspaceFolder) {
    this.folder = folder
  }

  static async create(folder: WorkspaceFolder): Promise<WorkspaceContext> {
    const ctx = new WorkspaceContext(folder)
    ctx.packageManager = await detectPackageManager(folder)

    if (ctx.packageManager !== 'npm') {
      const workspaceFilename = workspaceFileMapping[ctx.packageManager]
      const workspaceFile = Uri.joinPath(folder.uri, workspaceFilename)
      if (await accessOk(workspaceFile))
        ctx.catalogs = (await ctx.loadWorkspaceCatalogInfo(workspaceFile))?.catalogs
    }

    return ctx
  }

  #memoizeOptions: MemoizeOptions<Uri> = {
    getKey: (uri) => uri.path,
    ttl: false,
    maxSize: Number.POSITIVE_INFINITY,
    fallbackToCachedOnError: false,
  }

  #createResolvedDependencyInfo(dependency: DependencyInfo): ResolvedDependencyInfo {
    const resolution = resolveDependencySpec(dependency.rawName, dependency.rawSpec, this.catalogs)

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
    const text = await getDocumentText(uri)

    const extractor = getExtractor(path)
    if (!extractor)
      return

    const info = extractor.getPackageManifestInfo(text)
    if (!info)
      return

    return {
      ...info,
      dependencies: info.dependencies.map((dep) => this.#createResolvedDependencyInfo(dep)),
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
  return WorkspaceContext.create(folder)
}, {
  getKey: (folder) => folder.uri.path,
  ttl: false,
  fallbackToCachedOnError: false,
})

export function getWorkspaceContext(uri: Uri) {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  return getWorkspaceContextByFolder(folder)
}

export async function getResolvedDependencies(uri: Uri): Promise<ResolvedDependencyInfo[] | undefined> {
  const ctx = await getWorkspaceContext(uri)
  if (!ctx)
    return []

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
