import type { PackageContext, PackageManager, ResolvedDependencyInfo, WorkspaceContext } from '#types/context'
import type { DependencyInfo, PackageManifestInfo } from '#types/extractor'
import type { CatalogsInfo } from '#utils/dependency'
import type { MemoizedFunction } from '#utils/memoize'
import type { WorkspaceFolder } from 'vscode'
import { isSupportedDependencyDocument, packageManifestExtractorEntry, workspaceCatalogExtractorEntries } from '#extractors'
import { logger } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { isOffsetInRange } from '#utils/ast'
import { resolveDependencySpec } from '#utils/dependency'
import { memoize } from '#utils/memoize'
import { resolveExactVersion } from '#utils/package'
import { detectPackageManager } from '#utils/package-manager'
import { Uri, workspace } from 'vscode'
import { findUp } from 'vscode-find-up'
import { getDocumentText } from './document'

interface WorkspaceContextState {
  folder: WorkspaceFolder
  workspaceContext: WorkspaceContext
  loadPackageRecord: MemoizedFunction<Uri, Promise<PackageManifestInfo | undefined>>
  loadPackageContext: MemoizedFunction<Uri, Promise<PackageContext | undefined>>
  loadDocumentDependencies: MemoizedFunction<Uri, Promise<ResolvedDependencyInfo[] | undefined>>
}

function isPackageManifestPath(path: string) {
  return path.endsWith(`/${packageManifestExtractorEntry.basename}`)
}

function lazyInit<T>(factory: () => T): () => T {
  let cached: { value: T } | undefined
  return () => {
    if (!cached)
      cached = { value: factory() }
    return cached.value
  }
}

function createResolvedDependencyInfo(
  dependency: DependencyInfo,
  workspaceContext: WorkspaceContext,
): ResolvedDependencyInfo {
  const resolution = resolveDependencySpec(dependency.rawName, dependency.rawSpec, workspaceContext.catalogs)
  const packageInfo = lazyInit(
    () => resolution.resolvedProtocol === 'npm'
      ? getPackageInfo(resolution.resolvedName).then((pkg) => pkg ?? null)
      : Promise.resolve(null),
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

export async function readWorkspaceCatalogs(folder: WorkspaceFolder, packageManager: PackageManager): Promise<CatalogsInfo | undefined> {
  if (packageManager === 'npm')
    return

  const entry = workspaceCatalogExtractorEntries.find((entry) => entry.packageManager === packageManager)
  if (!entry)
    return

  const text = await getDocumentText(Uri.joinPath(folder.uri, entry.basename))

  return entry.extractor.getWorkspaceCatalogInfo(text)?.catalogs
}

const loadPackageRecord = memoize<Uri, Promise<PackageManifestInfo | undefined>>(async (uri) => {
  const text = await getDocumentText(uri)

  const manifestInfo = packageManifestExtractorEntry.extractor.getPackageManifestInfo(text)
  if (!manifestInfo)
    return

  return {
    name: manifestInfo.name,
    version: manifestInfo.version,
    engines: manifestInfo.engines,
    dependencies: manifestInfo.dependencies,
  }
}, { ttl: false, maxSize: Number.POSITIVE_INFINITY, fallbackToCachedOnError: false })

async function createWorkspaceContext(folder: WorkspaceFolder): Promise<WorkspaceContextState> {
  const workspacePath = folder.uri.path
  const packageManager = await detectPackageManager(folder)
  const catalogs = await readWorkspaceCatalogs(folder, packageManager)

  logger.info(`[workspace-context] built ${workspacePath}`)

  const workspaceContext = {
    packageManager,
    catalogs,
  }

  const loadDocumentDependencies = memoize<Uri, Promise<ResolvedDependencyInfo[] | undefined>>(async (uri) => {
    if (workspace.getWorkspaceFolder(uri)?.uri.path !== folder.uri.path)
      return []

    const path = uri.path
    let dependencies: DependencyInfo[] | undefined
    if (isPackageManifestPath(path)) {
      const packageRecord = await loadPackageRecord(uri)
      if (!packageRecord)
        return

      dependencies = packageRecord.dependencies
    } else {
      for (const entry of workspaceCatalogExtractorEntries) {
        if (!path.endsWith(`/${entry.basename}`))
          continue

        const text = await getDocumentText(uri)

        const catalogInfo = entry.extractor.getWorkspaceCatalogInfo(text)
        if (!catalogInfo)
          return

        dependencies = catalogInfo.dependencies
      }
    }

    return dependencies?.map((dependency) => createResolvedDependencyInfo(dependency, workspaceContext))
  }, { ttl: false, maxSize: Number.POSITIVE_INFINITY, fallbackToCachedOnError: false })

  return {
    folder,
    workspaceContext,
    loadPackageRecord,
    loadPackageContext: memoize<Uri, Promise<PackageContext | undefined>>(async (uri) => {
      const packageRecord = await loadPackageRecord(uri)
      if (!packageRecord)
        return

      const dependencies = await loadDocumentDependencies(uri) ?? []

      const packageContext: PackageContext = {
        packageJsonPath: uri.path,
        engines: packageRecord.engines,
        dependencies: new Map(),
      }

      for (const dependency of dependencies)
        packageContext.dependencies.set(dependency.resolvedName, dependency)

      return packageContext
    }, { ttl: false, maxSize: Number.POSITIVE_INFINITY, fallbackToCachedOnError: false }),
    loadDocumentDependencies,
  }
}

const getWorkspaceContextState = memoize<Uri, Promise<WorkspaceContextState | undefined>>(async (uri) => {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  return createWorkspaceContext(folder)
}, {
  getKey: (uri: Uri) => workspace.getWorkspaceFolder(uri)!.uri.path,
  ttl: false,
  fallbackToCachedOnError: false,
})

export function deleteWorkspaceContext(workspacePath: string) {
  getWorkspaceContextState.deleteByKey(workspacePath)
}

export async function getWorkspaceContext(uri: Uri): Promise<WorkspaceContext | undefined> {
  if (uri.scheme !== 'file' || !isSupportedDependencyDocument(uri))
    return

  const state = await getWorkspaceContextState(uri)
  if (!state)
    return

  if (isPackageManifestPath(uri.path))
    await state.loadPackageContext(uri)
  else
    await state.loadDocumentDependencies(uri)

  return state.workspaceContext
}

export async function getPackageContext(uri: Uri): Promise<PackageContext | undefined> {
  const packageJsonUri = await findUp(packageManifestExtractorEntry.basename, { cwd: uri })
  if (!packageJsonUri)
    return

  const state = await getWorkspaceContextState(uri)
  if (!state)
    return

  return state.loadPackageContext(packageJsonUri)
}

export async function getResolvedDependencies(uri: Uri): Promise<ResolvedDependencyInfo[]> {
  const state = await getWorkspaceContextState(uri)
  if (!state)
    return []

  return await state.loadDocumentDependencies(uri) ?? []
}

export async function getResolvedDependencyByOffset(uri: Uri, offset: number): Promise<ResolvedDependencyInfo | undefined> {
  const dependencies = await getResolvedDependencies(uri)

  return dependencies.find((dependency) => isOffsetInRange(offset, dependency.nameRange) || isOffsetInRange(offset, dependency.specRange))
}
