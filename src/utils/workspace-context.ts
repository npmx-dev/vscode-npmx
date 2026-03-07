import type { PackageContext, ResolvedDependencyInfo, WorkspaceContext } from '#types/context'
import type { DependencyInfo } from '#types/extractor'
import type { PackageInfo } from '#utils/api/package'
import type { MemoizedFunction } from '#utils/memoize'
import type { WorkspaceFolder } from 'vscode'
import { isSupportedDependencyDocument, packageManifestExtractorEntry, workspaceCatalogExtractorEntries } from '#extractors'
import { logger } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { isOffsetInRange } from '#utils/ast'
import { resolveDependencySpec } from '#utils/dependency'
import { readExtractorRoot } from '#utils/document'
import { memoize } from '#utils/memoize'
import { resolveExactVersion } from '#utils/package'
import { detectPackageManager, readWorkspaceCatalogs } from '#utils/package-manager'
import { normalize } from 'pathe'
import { Uri, workspace } from 'vscode'
import { findUp } from 'vscode-find-up'

interface PackageRecord {
  packageJsonPath: string
  name?: string
  version?: string
  engines?: PackageContext['engines']
  dependencies: DependencyInfo[]
}

interface WorkspaceContextState {
  folder: WorkspaceFolder
  workspaceContext: WorkspaceContext
  loadPackageRecord: MemoizedFunction<string, Promise<PackageRecord | undefined>>
  loadPackageContext: MemoizedFunction<string, Promise<PackageContext | undefined>>
  loadDocumentDependencies: MemoizedFunction<string, Promise<ResolvedDependencyInfo[]>>
}

function isPackageManifestPath(path: string) {
  return path.endsWith(`/${packageManifestExtractorEntry.basename}`)
}

async function readPackageRecord(uri: Uri): Promise<PackageRecord | undefined> {
  const root = await readExtractorRoot(uri, packageManifestExtractorEntry.extractor)
  if (!root)
    return

  const manifestInfo = packageManifestExtractorEntry.extractor.getPackageManifestInfo(root)

  return {
    packageJsonPath: normalize(uri.path),
    name: manifestInfo.name,
    version: manifestInfo.version,
    engines: manifestInfo.engines,
    dependencies: manifestInfo.dependencies,
  }
}

async function ensurePackageRecordByPath(state: WorkspaceContextState, packageJsonPath: string): Promise<PackageRecord | undefined> {
  return state.loadPackageRecord(normalize(packageJsonPath))
}

function createResolvedDependencyInfo(
  dependency: DependencyInfo,
  workspaceContext: WorkspaceContext,
): ResolvedDependencyInfo {
  const resolution = resolveDependencySpec(dependency.rawName, dependency.rawSpec, workspaceContext.catalogs)

  let packageInfoPromise: Promise<PackageInfo | null> | undefined
  let resolvedVersionPromise: Promise<string | null> | undefined

  return {
    ...dependency,
    protocol: resolution.protocol,
    categoryName: dependency.categoryName ?? resolution.categoryName,
    resolvedName: resolution.resolvedName,
    resolvedSpec: resolution.resolvedSpec,
    packageInfo: () => {
      if (!packageInfoPromise) {
        packageInfoPromise = resolution.resolvedProtocol === 'npm'
          ? getPackageInfo(resolution.resolvedName).then((pkg) => pkg ?? null)
          : Promise.resolve(null)
      }

      return packageInfoPromise
    },
    resolvedVersion: () => {
      if (!resolvedVersionPromise) {
        resolvedVersionPromise = (async () => {
          if (resolution.resolvedProtocol !== 'npm')
            return null

          const pkg = await getPackageInfo(resolution.resolvedName)
          if (!pkg)
            return null

          return resolveExactVersion(pkg, resolution.resolvedSpec)
        })()
      }

      return resolvedVersionPromise
    },
  }
}

function createResolvedDependencies(
  dependencies: DependencyInfo[],
  workspaceContext: WorkspaceContext,
) {
  return dependencies.map((dependency) =>
    createResolvedDependencyInfo(dependency, workspaceContext),
  )
}

async function readWorkspaceCatalogDocumentDependencies(
  state: WorkspaceContextState,
  basename: string,
  extractor: (typeof workspaceCatalogExtractorEntries)[number]['extractor'],
  uri: Uri,
) {
  if (!uri.path.endsWith(`/${basename}`))
    return []

  const root = await readExtractorRoot(uri, extractor)
  if (!root)
    return []

  const dependencies = extractor.getWorkspaceCatalogInfo(root).dependencies

  return createResolvedDependencies(
    dependencies,
    state.workspaceContext,
  )
}

async function readPackageDocumentDependencies(
  state: WorkspaceContextState,
  packageJsonPath: string,
) {
  const packageRecord = await ensurePackageRecordByPath(state, packageJsonPath)
  if (!packageRecord)
    return []

  return createResolvedDependencies(
    packageRecord.dependencies,
    state.workspaceContext,
  )
}

async function ensurePackageContextByPath(
  state: WorkspaceContextState,
  packageJsonPath: string,
): Promise<PackageContext | undefined> {
  return state.loadPackageContext(normalize(packageJsonPath))
}

async function ensureResolvedDependencies(
  state: WorkspaceContextState,
  uri: Uri,
): Promise<ResolvedDependencyInfo[]> {
  return await state.loadDocumentDependencies(normalize(uri.path)) ?? []
}

async function buildWorkspaceContext(folder: WorkspaceFolder): Promise<WorkspaceContextState> {
  const workspacePath = normalize(folder.uri.path)
  const packageManager = await detectPackageManager(folder)
  const catalogs = await readWorkspaceCatalogs(folder, packageManager)

  logger.info(`[workspace-context] built ${workspacePath}`)

  const state = {
    folder,
    workspaceContext: {
      packageManager,
      catalogs,
    },
  } as WorkspaceContextState

  state.loadPackageRecord = memoize<string, Promise<PackageRecord | undefined>>(async (normalizedPath) => {
    if (workspace.getWorkspaceFolder(Uri.file(normalizedPath))?.uri.path !== state.folder.uri.path)
      return

    return readPackageRecord(Uri.file(normalizedPath))
  }, {
    ttl: 0,
    maxSize: Number.POSITIVE_INFINITY,
    fallbackToCachedOnError: false,
  })

  state.loadPackageContext = memoize<string, Promise<PackageContext | undefined>>(async (normalizedPath) => {
    const packageRecord = await ensurePackageRecordByPath(state, normalizedPath)
    if (!packageRecord)
      return

    const dependencies = await state.loadDocumentDependencies(normalizedPath) ?? []

    const packageContext: PackageContext = {
      workspaceContext: state.workspaceContext,
      packageJsonPath: normalizedPath,
      engines: packageRecord.engines,
      dependencies: new Map(),
    }

    for (const dependency of dependencies)
      packageContext.dependencies.set(dependency.resolvedName, dependency)

    return packageContext
  }, {
    ttl: 0,
    maxSize: Number.POSITIVE_INFINITY,
    fallbackToCachedOnError: false,
  })

  state.loadDocumentDependencies = memoize<string, Promise<ResolvedDependencyInfo[]>>(async (normalizedPath) => {
    if (isPackageManifestPath(normalizedPath)) {
      return readPackageDocumentDependencies(state, normalizedPath)
    }

    for (const entry of workspaceCatalogExtractorEntries) {
      if (!normalizedPath.endsWith(`/${entry.basename}`))
        continue

      const dependencies = await readWorkspaceCatalogDocumentDependencies(
        state,
        entry.basename,
        entry.extractor,
        Uri.file(normalizedPath),
      )
      return dependencies
    }

    return []
  }, {
    ttl: 0,
    maxSize: Number.POSITIVE_INFINITY,
    fallbackToCachedOnError: false,
  })

  return state
}

const getWorkspaceContextState = memoize<Uri, Promise<WorkspaceContextState | undefined>>(async (uri) => {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  return buildWorkspaceContext(folder)
}, {
  getKey: (uri: Uri) => normalize(workspace.getWorkspaceFolder(uri)?.uri.path ?? uri.path),
  ttl: 0,
  maxSize: Number.POSITIVE_INFINITY,
  fallbackToCachedOnError: false,
})

async function findNearestPackageJsonUri(uri: Uri) {
  if (isPackageManifestPath(uri.path))
    return uri

  return findUp(packageManifestExtractorEntry.basename, {
    cwd: uri,
  })
}

export function invalidateWorkspaceContext(workspacePath: string) {
  const key = normalize(workspacePath)
  getWorkspaceContextState.deleteByKey(key)
  logger.info(`[workspace-context] invalidated ${key}`)
}

export async function getWorkspaceContext(uri: Uri): Promise<WorkspaceContext | undefined> {
  const state = await getWorkspaceContextState(uri)
  if (!state)
    return

  if (uri.scheme === 'file' && isSupportedDependencyDocument(uri)) {
    if (isPackageManifestPath(uri.path))
      await ensurePackageContextByPath(state, uri.path)
    else
      await ensureResolvedDependencies(state, uri)
  }

  return state.workspaceContext
}

export async function getPackageContext(uri: Uri): Promise<PackageContext | undefined> {
  const state = await getWorkspaceContextState(uri)
  if (!state)
    return

  const packageJsonUri = await findNearestPackageJsonUri(uri)
  if (!packageJsonUri)
    return

  return ensurePackageContextByPath(state, packageJsonUri.path)
}

export async function getResolvedDependencies(uri: Uri): Promise<ResolvedDependencyInfo[]> {
  const state = await getWorkspaceContextState(uri)
  if (!state)
    return []

  return ensureResolvedDependencies(state, uri)
}

export async function getResolvedDependencyByOffset(uri: Uri, offset: number): Promise<ResolvedDependencyInfo | undefined> {
  const dependencies = await getResolvedDependencies(uri)

  return dependencies.find((dependency) => isOffsetInRange(offset, dependency.nameRange) || isOffsetInRange(offset, dependency.specRange))
}

export async function warmWorkspaceContext(uri: Uri) {
  if (uri.scheme !== 'file' || !isSupportedDependencyDocument(uri))
    return

  await getWorkspaceContext(uri)
}
