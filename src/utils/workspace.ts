import type { CatalogsInfo, PackageManager, ResolvedDependencyInfo } from '#types/context'
import type { DependencyInfo, PackageManifestInfo, WorkspaceCatalogInfo } from '#types/extractor'
import type { MemoizeOptions } from '#utils/memoize'
import type { WorkspaceFolder } from 'vscode'
import { packageManifestExtractorEntry, workspaceCatalogExtractorEntries } from '#extractors'
import { logger } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { isOffsetInRange } from '#utils/ast'
import { resolveDependencySpec } from '#utils/dependency'
import { memoize } from '#utils/memoize'
import { resolveExactVersion } from '#utils/package'
import { detectPackageManager } from '#utils/package-manager'
import { Uri, workspace } from 'vscode'
import { getDocumentText, isPackageManifestPath } from './file'
import { lazyInit } from './shared'

type WithResolvedDependencyInfo<T> = Omit<T, 'dependencies'> & {
  dependencies: ResolvedDependencyInfo[]
}

class WorkspaceContext {
  folder: WorkspaceFolder
  packageManager: PackageManager = 'npm'
  catalogs?: CatalogsInfo

  constructor(folder: WorkspaceFolder) {
    this.folder = folder
    this.#init()
  }

  async #init() {
    this.packageManager = await detectPackageManager(this.folder)

    if (this.packageManager !== 'npm') {
      const workspaceFilename = workspaceCatalogExtractorEntries.find(
        (entry) => this.packageManager === entry.packageManager,
      )!.basename
      const workspaceFile = Uri.joinPath(
        this.folder.uri,
        workspaceFilename,
      )
      this.catalogs = (await this.loadWorkspaceCatalogInfo(workspaceFile))?.catalogs
    }
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
    if (!isPackageManifestPath(uri))
      return

    logger.info(`[workspace-context] load package manifest info: ${uri.path}`)
    const text = await getDocumentText(uri)

    const info = packageManifestExtractorEntry.extractor.getPackageManifestInfo(text)
    if (!info)
      return

    return {
      ...info,
      dependencies: info.dependencies.map(this.#createResolvedDependencyInfo),
    }
  }, this.#memoizeOptions)

  loadWorkspaceCatalogInfo = memoize<
    Uri,
    Promise<WithResolvedDependencyInfo<WorkspaceCatalogInfo> | undefined>
  >(async (uri) => {
    const path = uri.path
    logger.info(`[workspace-context] load workspace catalog info: ${path}`)

    for (const entry of workspaceCatalogExtractorEntries) {
      if (!path.endsWith(`/${entry.basename}`))
        continue

      const text = await getDocumentText(uri)

      const info = entry.extractor.getWorkspaceCatalogInfo(text)
      if (!info)
        return

      return {
        ...info,
        dependencies: info.dependencies.map(this.#createResolvedDependencyInfo),
      }
    }
  }, this.#memoizeOptions)
}

export const getWorkspaceContext = memoize<Uri, Promise<WorkspaceContext | undefined>>(async (uri) => {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  logger.info(`[workspace-context] built ${folder.uri.path}`)
  return new WorkspaceContext(folder)
}, {
  getKey: (uri: Uri) => workspace.getWorkspaceFolder(uri)!.uri.path,
  ttl: false,
  fallbackToCachedOnError: false,
})

export async function getResolvedDependencies(uri: Uri): Promise<ResolvedDependencyInfo[] | undefined> {
  const ctx = await getWorkspaceContext(uri)
  if (!ctx)
    return []

  return (
    isPackageManifestPath(uri)
      ? await ctx.loadPackageManifestInfo(uri)
      : await ctx.loadWorkspaceCatalogInfo(uri)
  )?.dependencies
}

export async function getResolvedDependencyByOffset(uri: Uri, offset: number): Promise<ResolvedDependencyInfo | undefined> {
  const dependencies = await getResolvedDependencies(uri)

  return dependencies?.find((dependency) => isOffsetInRange(offset, dependency.nameRange) || isOffsetInRange(offset, dependency.specRange))
}
