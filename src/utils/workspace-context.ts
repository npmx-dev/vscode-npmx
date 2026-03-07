import type { PackageContext, ResolvedDependencyInfo, WorkspaceContext } from '#types/context'
import type { DependencyInfo, Extractor } from '#types/extractor'
import type { PackageInfo } from '#utils/api/package'
import type { TextDocument, WorkspaceFolder } from 'vscode'
import { isSupportedDependencyDocument, packageManifestExtractorEntry, workspaceCatalogExtractorEntries } from '#extractors'
import { logger } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { isOffsetInRange } from '#utils/ast'
import { resolveDependencySpec } from '#utils/dependency-spec'
import { resolveExactVersion } from '#utils/package'
import { detectPackageManager, readWorkspaceCatalogs } from '#utils/package-manager'
import { dirname, join, normalize, resolve } from 'pathe'
import { Uri, workspace } from 'vscode'

interface PackageRecord {
  packageJsonPath: string
  name?: string
  version?: string
  engines?: PackageContext['engines']
  dependencies: DependencyInfo[]
}

interface WorkspaceContextState {
  workspaceContext: WorkspaceContext
  documentDependencies: Map<string, ResolvedDependencyInfo[]>
}

interface DependencyResolutionContext {
  sourcePath: string
  workspaceContext: WorkspaceContext
}

const decoder = new TextDecoder()
const workspaceContextCache = new Map<string, WorkspaceContextState>()
const pendingWorkspaceContext = new Map<string, Promise<WorkspaceContextState | undefined>>()

function getDependencyKey(dep: Pick<ResolvedDependencyInfo, 'category' | 'rawName'>): string {
  return `${dep.category}:${dep.rawName}`
}

function getOpenDependencyDocuments(workspacePath: string): Map<string, TextDocument> {
  const documents = new Map<string, TextDocument>()

  const addDocument = (document: TextDocument | undefined) => {
    if (!document || document.uri.scheme !== 'file' || !isSupportedDependencyDocument(document))
      return

    const folder = workspace.getWorkspaceFolder(document.uri)
    if (!folder || normalize(folder.uri.path) !== workspacePath)
      return

    documents.set(normalize(document.uri.path), document)
  }

  workspace.textDocuments.forEach(addDocument)

  return documents
}

async function readDocumentText(uri: Uri, openDocuments: Map<string, TextDocument>): Promise<string | undefined> {
  const openDocument = openDocuments.get(normalize(uri.path))
  if (openDocument)
    return openDocument.getText()

  try {
    const content = await workspace.fs.readFile(uri)
    return decoder.decode(content)
  } catch {}
}

async function readExtractorRoot<T>(
  uri: Uri,
  extractor: Extractor<T>,
  openDocuments: Map<string, TextDocument>,
): Promise<T | undefined> {
  const text = await readDocumentText(uri, openDocuments)
  if (!text)
    return

  const root = extractor.parse(text)
  if (!root)
    return

  return root
}

async function collectPackageUris(folder: WorkspaceFolder, openDocuments: Map<string, TextDocument>) {
  const uris = new Map<string, Uri>()
  const scanned = await workspace.findFiles(
    `**/${packageManifestExtractorEntry.basename}`,
    '**/node_modules/**',
  ) ?? []

  for (const uri of scanned) {
    if (uri.scheme === 'file' && workspace.getWorkspaceFolder(uri)?.uri.path === folder.uri.path)
      uris.set(normalize(uri.path), uri)
  }

  for (const document of openDocuments.values()) {
    if (document.uri.path.endsWith(`/${packageManifestExtractorEntry.basename}`))
      uris.set(normalize(document.uri.path), document.uri)
  }

  return [...uris.values()].toSorted((left: Uri, right: Uri) => left.path.localeCompare(right.path))
}

async function readPackageRecord(uri: Uri, openDocuments: Map<string, TextDocument>): Promise<PackageRecord | undefined> {
  const root = await readExtractorRoot(uri, packageManifestExtractorEntry.extractor, openDocuments)
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

function getWorkspaceReferenceByPath(sourcePath: string, reference: string, packageRecordsByPath: Map<string, PackageRecord>) {
  const baseDir = dirname(sourcePath)
  const absolutePath = normalize(resolve(baseDir, reference))
  const packageJsonPathCandidate = absolutePath.endsWith(packageManifestExtractorEntry.basename)
    ? absolutePath
    : normalize(join(absolutePath, packageManifestExtractorEntry.basename))

  const record = packageRecordsByPath.get(packageJsonPathCandidate)
  if (!record)
    return

  return {
    name: record.name,
    version: record.version,
  }
}

function createResolvedDependencyInfo(
  dependency: DependencyInfo,
  context: DependencyResolutionContext,
  packageRecordsByName: Map<string, PackageRecord>,
  packageRecordsByPath: Map<string, PackageRecord>,
): ResolvedDependencyInfo {
  const resolution = resolveDependencySpec(dependency.rawName, dependency.rawSpec, {
    catalogs: context.workspaceContext.catalogs,
    resolveWorkspacePackage: (name) => {
      const record = packageRecordsByName.get(name)
      if (!record)
        return

      return {
        name: record.name,
        version: record.version,
      }
    },
    resolveWorkspacePackageByPath: (path) => getWorkspaceReferenceByPath(context.sourcePath, path, packageRecordsByPath),
  })

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
        packageInfoPromise = resolution.finalProtocol === 'npm'
          ? getPackageInfo(resolution.resolvedName).then((pkg) => pkg ?? null)
          : Promise.resolve(null)
      }

      return packageInfoPromise
    },
    resolvedVersion: () => {
      if (!resolvedVersionPromise) {
        resolvedVersionPromise = (async () => {
          if (resolution.finalProtocol !== 'npm')
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
  context: DependencyResolutionContext,
  packageRecordsByName: Map<string, PackageRecord>,
  packageRecordsByPath: Map<string, PackageRecord>,
) {
  return dependencies.map((dependency) =>
    createResolvedDependencyInfo(dependency, context, packageRecordsByName, packageRecordsByPath),
  )
}

async function readWorkspaceCatalogDocumentDependencies(
  basename: string,
  extractor: (typeof workspaceCatalogExtractorEntries)[number]['extractor'],
  uri: Uri,
  workspaceContext: WorkspaceContext,
  openDocuments: Map<string, TextDocument>,
  packageRecordsByName: Map<string, PackageRecord>,
  packageRecordsByPath: Map<string, PackageRecord>,
) {
  if (!uri.path.endsWith(`/${basename}`))
    return

  const root = await readExtractorRoot(uri, extractor, openDocuments)
  if (!root)
    return

  return createResolvedDependencies(
    extractor.getWorkspaceCatalogInfo(root).dependencies,
    {
      sourcePath: normalize(uri.path),
      workspaceContext,
    },
    packageRecordsByName,
    packageRecordsByPath,
  )
}

async function buildWorkspaceContext(folder: WorkspaceFolder): Promise<WorkspaceContextState> {
  const workspacePath = normalize(folder.uri.path)
  const openDocuments = getOpenDependencyDocuments(workspacePath)
  const packageManager = await detectPackageManager(folder, openDocuments, readDocumentText, readExtractorRoot)
  const catalogs = await readWorkspaceCatalogs(folder, packageManager, openDocuments, readExtractorRoot)
  const packageUris = await collectPackageUris(folder, openDocuments)
  const packageRecords = (await Promise.all(packageUris.map((uri: Uri) => readPackageRecord(uri, openDocuments))))
    .filter((record: PackageRecord | undefined): record is PackageRecord => record != null)

  const packageRecordsByName = new Map<string, PackageRecord>()
  const packageRecordsByPath = new Map<string, PackageRecord>()

  for (const packageRecord of packageRecords) {
    packageRecordsByPath.set(packageRecord.packageJsonPath, packageRecord)
    if (packageRecord.name && !packageRecordsByName.has(packageRecord.name))
      packageRecordsByName.set(packageRecord.name, packageRecord)
  }

  const workspaceContext: WorkspaceContext = {
    packageManager,
    catalogs,
    packages: new Map(),
  }
  const documentDependencies = new Map<string, ResolvedDependencyInfo[]>()

  for (const packageRecord of packageRecords) {
    workspaceContext.packages.set(packageRecord.packageJsonPath, {
      workspaceContext,
      packageJsonPath: packageRecord.packageJsonPath,
      engines: packageRecord.engines,
      dependencies: new Map(),
    })
  }

  for (const packageRecord of packageRecords) {
    const packageContext = workspaceContext.packages.get(packageRecord.packageJsonPath)
    if (!packageContext)
      continue

    const dependencies = createResolvedDependencies(
      packageRecord.dependencies,
      {
        sourcePath: packageRecord.packageJsonPath,
        workspaceContext,
      },
      packageRecordsByName,
      packageRecordsByPath,
    )

    documentDependencies.set(packageRecord.packageJsonPath, dependencies)

    for (const dependency of dependencies) {
      packageContext.dependencies.set(
        getDependencyKey(dependency),
        dependency,
      )
    }
  }

  for (const entry of workspaceCatalogExtractorEntries) {
    const uri = Uri.joinPath(folder.uri, entry.basename)
    const dependencies = await readWorkspaceCatalogDocumentDependencies(
      entry.basename,
      entry.extractor,
      uri,
      workspaceContext,
      openDocuments,
      packageRecordsByName,
      packageRecordsByPath,
    )

    if (dependencies?.length)
      documentDependencies.set(normalize(uri.path), dependencies)
  }

  logger.info(`[workspace-context] built ${workspacePath}`)

  return {
    workspaceContext,
    documentDependencies,
  }
}

function findNearestPackageContext(workspaceContext: WorkspaceContext, uri: Uri, workspacePath: string): PackageContext | undefined {
  const normalizedPath = normalize(uri.path)
  if (normalizedPath.endsWith(`/${packageManifestExtractorEntry.basename}`))
    return workspaceContext.packages.get(normalizedPath)

  let currentDirectory = dirname(normalizedPath)
  while (currentDirectory.startsWith(workspacePath)) {
    const packageContext = workspaceContext.packages.get(join(currentDirectory, packageManifestExtractorEntry.basename))
    if (packageContext)
      return packageContext

    const parentDirectory = dirname(currentDirectory)
    if (parentDirectory === currentDirectory)
      break
    currentDirectory = parentDirectory
  }
}

export function invalidateWorkspaceContext(workspacePath: string) {
  const key = normalize(workspacePath)
  workspaceContextCache.delete(key)
  pendingWorkspaceContext.delete(key)
  logger.info(`[workspace-context] invalidated ${key}`)
}

export async function getWorkspaceContext(uri: Uri): Promise<WorkspaceContext | undefined> {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  const workspacePath = normalize(folder.uri.path)
  const cacheHit = workspaceContextCache.get(workspacePath)
  if (cacheHit)
    return cacheHit.workspaceContext

  const pending = pendingWorkspaceContext.get(workspacePath)
  if (pending)
    return pending.then((state) => state?.workspaceContext)

  const promise = buildWorkspaceContext(folder)
    .then((state) => {
      workspaceContextCache.set(workspacePath, state)
      return state
    })
    .finally(() => {
      pendingWorkspaceContext.delete(workspacePath)
    })

  pendingWorkspaceContext.set(workspacePath, promise)
  return promise.then((state) => state.workspaceContext)
}

export async function getPackageContext(uri: Uri): Promise<PackageContext | undefined> {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  const workspacePath = normalize(folder.uri.path)
  const workspaceContext = await getWorkspaceContext(uri)
  if (!workspaceContext)
    return

  return findNearestPackageContext(workspaceContext, uri, workspacePath)
}

async function getWorkspaceContextState(uri: Uri): Promise<WorkspaceContextState | undefined> {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  const workspacePath = normalize(folder.uri.path)
  const cacheHit = workspaceContextCache.get(workspacePath)
  if (cacheHit)
    return cacheHit

  await getWorkspaceContext(uri)
  return workspaceContextCache.get(workspacePath)
}

export async function getResolvedDependencies(uri: Uri): Promise<ResolvedDependencyInfo[]> {
  const state = await getWorkspaceContextState(uri)
  if (!state)
    return []

  return state.documentDependencies.get(normalize(uri.path)) ?? []
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
