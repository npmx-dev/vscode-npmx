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
import { dirname, join } from 'path-browserify'
import { getPackageInfo } from './api/package'
import { PACKAGE_JSON_BASENAME, PNPM_WORKSPACE_BASENAME, YARN_WORKSPACE_BASENAME } from './constants'
import { getExtractor } from './extractors'
import { isPackageManifest, lazyInit, resolveDependencySpec, resolveExactVersion } from './utils'

export interface DependencyInfo extends ExtractedDependencyInfo, Omit<ResolvedDependencyInfo, keyof ExtractedDependencyInfo> {
  packageInfo: () => Promise<PackageInfo | null>
  resolvedVersion: () => Promise<string | null>
}

export type WithDependencyInfo<T> = Omit<T, 'dependencies'> & {
  dependencies: DependencyInfo[]
}

export type PackageManager = 'bun' | 'npm' | 'pnpm' | 'yarn'

export interface WorkspaceAdapter {
  readFile: (path: string) => Promise<string>
  fileExists: (path: string) => Promise<boolean>
  detectPackageManager: (rootPath: string) => Promise<PackageManager>
}

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

export async function detectPackageManagerFromFiles(
  rootPath: string,
  adapter: Pick<WorkspaceAdapter, 'fileExists' | 'readFile'>,
): Promise<PackageManager> {
  const manifestPath = join(rootPath, PACKAGE_JSON_BASENAME)
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
      if (await adapter.fileExists(join(rootPath, basename)))
        return packageManager
    }
  }

  if (await adapter.fileExists(join(rootPath, PNPM_WORKSPACE_BASENAME)))
    return 'pnpm'

  if (await adapter.fileExists(join(rootPath, YARN_WORKSPACE_BASENAME)))
    return 'yarn'

  return 'npm'
}

function isPackageManagerManifest(value: unknown): value is { packageManager?: string } {
  if (typeof value !== 'object' || value === null)
    return false

  return !('packageManager' in value) || typeof value.packageManager === 'string'
}

function getWorkspaceFileBasename(packageManager: PackageManager): string | undefined {
  switch (packageManager) {
    case 'bun':
      return PACKAGE_JSON_BASENAME
    case 'pnpm':
      return PNPM_WORKSPACE_BASENAME
    case 'yarn':
      return YARN_WORKSPACE_BASENAME
  }
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

  isWorkspaceFile(path: string) {
    return path === this.workspaceFilePath
  }

  async loadWorkspace() {
    this.#catalogs = Promise.withResolvers()
    this.packageManager = await this.adapter.detectPackageManager(this.rootPath)
    this.workspaceFilePath = undefined

    const workspaceFilename = getWorkspaceFileBasename(this.packageManager)
    if (workspaceFilename) {
      this.workspaceFilePath = join(this.rootPath, workspaceFilename)
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
    if (!this.isWorkspaceFile(path))
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

  async findNearestPackageManifestPath(packageManifestPath: string): Promise<string | undefined> {
    let dir = dirname(packageManifestPath)

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

    if (this.isWorkspaceFile(path))
      await this.loadWorkspaceFileInfo.invalidate(path)
  }
}
