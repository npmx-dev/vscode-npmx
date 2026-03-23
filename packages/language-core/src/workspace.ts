import type { CacheOptions } from 'ocache'
import type { PackageInfo } from './api/package'
import type {
  CatalogsInfo,
  ExtractedDependencyInfo,
  PackageManifestInfo,
  ResolvedDependencyInfo,
  WorkspaceCatalogInfo,
} from './types'
import { defineCachedFunction } from 'ocache'
import { dirname, join } from 'pathe'
import { getPackageInfo } from './api/package'
import { PACKAGE_JSON_BASENAME, PNPM_WORKSPACE_BASENAME, YARN_WORKSPACE_BASENAME } from './constants'
import { getExtractor } from './extractors'
import { isPackageManifest, isWorkspaceFile, lazyInit, resolveDependencySpec, resolveExactVersion } from './utils'

const workspaceFileMapping: Record<'pnpm' | 'yarn', string> = {
  pnpm: PNPM_WORKSPACE_BASENAME,
  yarn: YARN_WORKSPACE_BASENAME,
}

export interface DependencyInfo extends ExtractedDependencyInfo, Omit<ResolvedDependencyInfo, keyof ExtractedDependencyInfo> {
  packageInfo: () => Promise<PackageInfo | null>
  resolvedVersion: () => Promise<string | null>
}

export type WithDependencyInfo<T> = Omit<T, 'dependencies'> & {
  dependencies: DependencyInfo[]
}

export type PackageManager = 'npm' | 'pnpm' | 'yarn'

export interface WorkspaceAdapter {
  readFile: (path: string) => Promise<string>
  fileExists: (path: string) => Promise<boolean>
  detectPackageManager: (rootPath: string) => Promise<PackageManager>
}

function createResolvedDependencyInfo(
  dependency: ExtractedDependencyInfo,
  catalogs?: CatalogsInfo,
): DependencyInfo {
  const resolution = resolveDependencySpec(dependency.rawName, dependency.rawSpec, catalogs)

  const packageInfo = lazyInit(
    async () => resolution.resolvedProtocol === 'npm'
      ? await getPackageInfo(resolution.resolvedName) ?? null
      : null,
  )

  return {
    ...dependency,
    protocol: resolution.protocol,
    categoryName: dependency.categoryName ?? resolution.categoryName,
    resolvedName: resolution.resolvedName,
    resolvedSpec: resolution.resolvedSpec,
    resolvedProtocol: resolution.resolvedProtocol ?? 'npm',
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

export class WorkspaceContext {
  rootPath: string
  adapter: WorkspaceAdapter
  packageManager: PackageManager = 'npm'
  workspaceFilePath?: string
  #catalogs?: PromiseWithResolvers<CatalogsInfo | undefined>

  protected constructor(rootPath: string, adapter: WorkspaceAdapter) {
    this.rootPath = rootPath
    this.adapter = adapter
  }

  static async create(rootPath: string, adapter: WorkspaceAdapter): Promise<WorkspaceContext> {
    const ctx = new WorkspaceContext(rootPath, adapter)
    await ctx.loadWorkspace()
    return ctx
  }

  async loadWorkspace() {
    this.#catalogs = Promise.withResolvers()
    this.packageManager = await this.adapter.detectPackageManager(this.rootPath)

    if (this.packageManager !== 'npm') {
      const workspaceFilename = workspaceFileMapping[this.packageManager]
      this.workspaceFilePath = `${this.rootPath}/${workspaceFilename}`
      this.#catalogs.resolve(
        await this.adapter.fileExists(this.workspaceFilePath)
          ? (await this.loadWorkspaceFileInfo(this.workspaceFilePath))?.catalogs
          : undefined,
      )
    } else {
      this.#catalogs.resolve(undefined)
    }
  }

  async getCatalogs(): Promise<CatalogsInfo | undefined> {
    return this.#catalogs!.promise
  }

  #cacheOptions: CacheOptions<any, [string]> = {
    getKey: (path) => path,
    maxAge: 0,
    swr: false,
    staleMaxAge: 0,
  }

  loadPackageManifestInfo = defineCachedFunction<
    WithDependencyInfo<PackageManifestInfo> | undefined,
    [string]
  >(async (path) => {
    if (!isPackageManifest(path))
      return

    const extractor = getExtractor(path)
    if (!extractor)
      return

    const [info, catalogs] = await Promise.all([
      this.adapter.readFile(path).then((text) => extractor.getPackageManifestInfo(text)),
      this.getCatalogs(),
    ])

    if (!info)
      return

    return {
      ...info,
      dependencies: info.dependencies.map((dep) => createResolvedDependencyInfo(dep, catalogs)),
    }
  }, this.#cacheOptions)

  loadWorkspaceFileInfo = defineCachedFunction<
    WithDependencyInfo<WorkspaceCatalogInfo> | undefined,
    [string]
  >(async (path) => {
    if (!isWorkspaceFile(path))
      return

    const extractor = getExtractor(path)
    if (!extractor)
      return

    const text = await this.adapter.readFile(path)
    const info = extractor.getWorkspaceCatalogInfo(text)

    if (!info)
      return

    return {
      ...info,
      dependencies: info.dependencies.map((dep) => createResolvedDependencyInfo(dep)),
    }
  }, this.#cacheOptions)

  async findNearestPackageManifestPath(path: string): Promise<string | undefined> {
    let dir = dirname(path)

    while (dir === this.rootPath || dir.startsWith(`${this.rootPath}/`)) {
      const manifestPath = join(dir, PACKAGE_JSON_BASENAME)
      if (await this.adapter.fileExists(manifestPath))
        return manifestPath

      if (dir === this.rootPath)
        break

      const parent = dirname(dir)
      if (parent === dir)
        break
      dir = parent
    }
  }

  async invalidateDependencyInfo(path: string) {
    if (isPackageManifest(path))
      await this.loadPackageManifestInfo.invalidate(path)
    else if (isWorkspaceFile(path))
      await this.loadWorkspaceFileInfo.invalidate(path)
  }
}
