import type { CatalogsInfo, ResolvedDependencyInfo, WorkspaceContext } from '#types/context'
import type { DependencyInfo, PackageManifestInfo, WorkspaceCatalogInfo } from '#types/extractor'
import type { MemoizedFunction } from '#utils/memoize'
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
import { getDocumentText } from './document'

type WithResolvedDependencyInfo<T> = Omit<T, 'dependencies'> & {
  dependencies: ResolvedDependencyInfo[]
}

interface WorkspaceContextState {
  folder: WorkspaceFolder
  workspaceContext: WorkspaceContext
  loadPackageManifestInfo: MemoizedFunction<Uri, Promise<WithResolvedDependencyInfo<PackageManifestInfo> | undefined>>
  loadWorkspaceCatalogInfo: MemoizedFunction<Uri, Promise<WithResolvedDependencyInfo<WorkspaceCatalogInfo> | undefined>>
}

export function isPackageManifestPath(path: string) {
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
  catalogs?: CatalogsInfo,
): ResolvedDependencyInfo {
  const resolution = resolveDependencySpec(dependency.rawName, dependency.rawSpec, catalogs)
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

export const getWorkspaceContextState = memoize<Uri, Promise<WorkspaceContextState | undefined>>(async (uri) => {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  const packageManager = await detectPackageManager(folder)

  const loadWorkspaceCatalogInfo = memoize(async (uri: Uri): Promise<WithResolvedDependencyInfo<WorkspaceCatalogInfo> | undefined> => {
    const path = uri.path

    for (const entry of workspaceCatalogExtractorEntries) {
      if (!path.endsWith(`/${entry.basename}`))
        continue

      const text = await getDocumentText(uri)

      const info = entry.extractor.getWorkspaceCatalogInfo(text)
      if (!info)
        return

      return {
        ...info,
        dependencies: info.dependencies.map((dependency) => createResolvedDependencyInfo(dependency)),
      }
    }
  }, { ttl: false, maxSize: Number.POSITIVE_INFINITY, fallbackToCachedOnError: false })

  let catalogs: CatalogsInfo | undefined

  if (packageManager !== 'npm') {
    const workspaceFile = Uri.joinPath(
      folder.uri,
      workspaceCatalogExtractorEntries.find((entry) => packageManager === entry.packageManager)!.basename,
    )
    catalogs = (await loadWorkspaceCatalogInfo(workspaceFile))?.catalogs
  }

  logger.info(`[workspace-context] built ${folder.uri.path}`)

  return {
    folder,
    workspaceContext: {
      packageManager,
      catalogs,
    },
    loadPackageManifestInfo: memoize(async (uri: Uri) => {
      if (!isPackageManifestPath(uri.path))
        return

      const text = await getDocumentText(uri)

      const info = packageManifestExtractorEntry.extractor.getPackageManifestInfo(text)
      if (!info)
        return

      return {
        ...info,
        dependencies: info.dependencies.map((dependency) => createResolvedDependencyInfo(dependency, catalogs)),
      }
    }, { ttl: false, maxSize: Number.POSITIVE_INFINITY, fallbackToCachedOnError: false }),
    loadWorkspaceCatalogInfo,
  }
}, {
  getKey: (uri: Uri) => workspace.getWorkspaceFolder(uri)!.uri.path,
  ttl: false,
  fallbackToCachedOnError: false,
})

export async function getResolvedDependencies(uri: Uri): Promise<ResolvedDependencyInfo[] | undefined> {
  const state = await getWorkspaceContextState(uri)
  if (!state)
    return []

  return (
    isPackageManifestPath(uri.path)
      ? await state.loadPackageManifestInfo(uri)
      : await state.loadWorkspaceCatalogInfo(uri)
  )?.dependencies
}

export async function getResolvedDependencyByOffset(uri: Uri, offset: number): Promise<ResolvedDependencyInfo | undefined> {
  const dependencies = await getResolvedDependencies(uri)

  return dependencies?.find((dependency) => isOffsetInRange(offset, dependency.nameRange) || isOffsetInRange(offset, dependency.specRange))
}
