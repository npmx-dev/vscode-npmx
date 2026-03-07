import type { PackageContext, PackageManager, ResolvedDependencyInfo, WorkspaceContext } from '#types/context'
import type { DependencyInfo } from '#types/extractor'
import type { PackageInfo } from '#utils/api/package'
import type { TextDocument, WorkspaceFolder } from 'vscode'
import { PACKAGE_JSON_BASENAME, PNPM_WORKSPACE_BASENAME, YARN_WORKSPACE_BASENAME } from '#constants'
import { isSupportedDependencyDocument, packageJsonExtractor, workspaceCatalogExtractor } from '#extractors'
import { logger } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { resolveDependencySpec } from '#utils/dependency-spec'
import { resolveExactVersion } from '#utils/package'
import { dirname, join, normalize, resolve } from 'pathe'
import { Uri, workspace } from 'vscode'

interface PackageRecord {
  packageJsonPath: string
  name?: string
  version?: string
  engines?: PackageContext['engines']
  dependencies: DependencyInfo[]
}

const decoder = new TextDecoder()
const workspaceContextCache = new Map<string, WorkspaceContext>()
const pendingWorkspaceContext = new Map<string, Promise<WorkspaceContext | undefined>>()

function getDependencyKey(dep: DependencyInfo): string {
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

async function collectPackageUris(folder: WorkspaceFolder, openDocuments: Map<string, TextDocument>) {
  const uris = new Map<string, Uri>()
  const scanned = await workspace.findFiles(
    `**/${PACKAGE_JSON_BASENAME}`,
    '**/node_modules/**',
  ) ?? []

  for (const uri of scanned) {
    if (uri.scheme === 'file' && workspace.getWorkspaceFolder(uri)?.uri.path === folder.uri.path)
      uris.set(normalize(uri.path), uri)
  }

  for (const document of openDocuments.values()) {
    if (document.uri.path.endsWith(`/${PACKAGE_JSON_BASENAME}`))
      uris.set(normalize(document.uri.path), document.uri)
  }

  return [...uris.values()].toSorted((left: Uri, right: Uri) => left.path.localeCompare(right.path))
}

async function readPackageRecord(uri: Uri, openDocuments: Map<string, TextDocument>): Promise<PackageRecord | undefined> {
  const text = await readDocumentText(uri, openDocuments)
  if (!text)
    return

  const root = packageJsonExtractor.parse(text)
  if (!root)
    return

  return {
    packageJsonPath: normalize(uri.path),
    name: packageJsonExtractor.getPackageName(root),
    version: packageJsonExtractor.getPackageVersion(root),
    engines: packageJsonExtractor.getEngines(root),
    dependencies: packageJsonExtractor.getDependenciesInfo(root),
  }
}

function getWorkspaceReferenceByPath(packageJsonPath: string, reference: string, packageRecordsByPath: Map<string, PackageRecord>) {
  const baseDir = dirname(packageJsonPath)
  const absolutePath = resolve(baseDir, reference)
  const packageJsonPathCandidate = absolutePath.endsWith(PACKAGE_JSON_BASENAME)
    ? absolutePath
    : join(absolutePath, PACKAGE_JSON_BASENAME)

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
  packageContext: PackageContext,
  packageRecordsByName: Map<string, PackageRecord>,
  packageRecordsByPath: Map<string, PackageRecord>,
): ResolvedDependencyInfo {
  const resolution = resolveDependencySpec(dependency.rawName, dependency.rawSpec, {
    catalogs: packageContext.workspaceContext.catalogs,
    resolveWorkspacePackage: (name) => {
      const record = packageRecordsByName.get(name)
      if (!record)
        return

      return {
        name: record.name,
        version: record.version,
      }
    },
    resolveWorkspacePackageByPath: (path) => getWorkspaceReferenceByPath(packageContext.packageJsonPath, path, packageRecordsByPath),
  })

  let packageInfoPromise: Promise<PackageInfo | null> | undefined
  let resolvedVersionPromise: Promise<string | null> | undefined

  return {
    category: dependency.category,
    rawName: dependency.rawName,
    rawSpec: dependency.rawSpec,
    nameNode: dependency.nameNode,
    specNode: dependency.specNode,
    versionNode: dependency.versionNode,
    protocol: resolution.protocol,
    catalogName: dependency.catalogName ?? resolution.catalogName,
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

async function detectPackageManager(folder: WorkspaceFolder, openDocuments: Map<string, TextDocument>): Promise<PackageManager> {
  const rootPackageJsonUri = Uri.joinPath(folder.uri, PACKAGE_JSON_BASENAME)
  const rootPackageJsonText = await readDocumentText(rootPackageJsonUri, openDocuments)
  if (rootPackageJsonText) {
    const root = packageJsonExtractor.parse(rootPackageJsonText)
    const declaredPackageManager = root ? packageJsonExtractor.getPackageManager(root) : undefined
    const packageManagerName = declaredPackageManager?.split('@')[0]
    if (packageManagerName === 'npm' || packageManagerName === 'pnpm' || packageManagerName === 'yarn')
      return packageManagerName
  }

  if (await readDocumentText(Uri.joinPath(folder.uri, PNPM_WORKSPACE_BASENAME), openDocuments))
    return 'pnpm'

  if (await readDocumentText(Uri.joinPath(folder.uri, YARN_WORKSPACE_BASENAME), openDocuments))
    return 'yarn'

  return 'npm'
}

async function readCatalogs(
  folder: WorkspaceFolder,
  packageManager: PackageManager,
  openDocuments: Map<string, TextDocument>,
) {
  if (packageManager !== 'pnpm' && packageManager !== 'yarn')
    return

  const configUri = Uri.joinPath(folder.uri, packageManager === 'pnpm' ? PNPM_WORKSPACE_BASENAME : YARN_WORKSPACE_BASENAME)
  const text = await readDocumentText(configUri, openDocuments)
  if (!text)
    return

  const root = workspaceCatalogExtractor.parse(text)
  if (!root)
    return

  const catalogs: Record<string, Record<string, string>> = {}

  for (const dependency of workspaceCatalogExtractor.getDependenciesInfo(root)) {
    const catalogName = dependency.category === 'catalog' ? 'default' : dependency.catalogName || 'default'
    catalogs[catalogName] ??= {}
    catalogs[catalogName][dependency.rawName] = dependency.rawSpec
  }

  return Object.keys(catalogs).length > 0 ? catalogs : undefined
}

async function buildWorkspaceContext(folder: WorkspaceFolder): Promise<WorkspaceContext | undefined> {
  const workspacePath = normalize(folder.uri.path)
  const openDocuments = getOpenDependencyDocuments(workspacePath)
  const packageManager = await detectPackageManager(folder, openDocuments)
  const catalogs = await readCatalogs(folder, packageManager, openDocuments)
  const packageUris = await collectPackageUris(folder, openDocuments)
  const packageRecords = (await Promise.all(packageUris.map((uri: Uri) => readPackageRecord(uri, openDocuments))))
    .filter((record: PackageRecord | undefined): record is PackageRecord => record != null)

  if (packageRecords.length === 0)
    return

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

    for (const dependency of packageRecord.dependencies) {
      packageContext.dependencies.set(
        getDependencyKey(dependency),
        createResolvedDependencyInfo(dependency, packageContext, packageRecordsByName, packageRecordsByPath),
      )
    }
  }

  logger.info(`[workspace-context] built ${workspacePath}`)

  return workspaceContext
}

function findNearestPackageContext(workspaceContext: WorkspaceContext, uri: Uri, workspacePath: string): PackageContext | undefined {
  const normalizedPath = normalize(uri.path)
  if (normalizedPath.endsWith(`/${PACKAGE_JSON_BASENAME}`))
    return workspaceContext.packages.get(normalizedPath)

  let currentDirectory = dirname(normalizedPath)
  while (currentDirectory.startsWith(workspacePath)) {
    const packageContext = workspaceContext.packages.get(join(currentDirectory, PACKAGE_JSON_BASENAME))
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
    return cacheHit

  const pending = pendingWorkspaceContext.get(workspacePath)
  if (pending)
    return pending

  const promise = buildWorkspaceContext(folder)
    .then((context) => {
      if (context)
        workspaceContextCache.set(workspacePath, context)
      return context
    })
    .finally(() => {
      pendingWorkspaceContext.delete(workspacePath)
    })

  pendingWorkspaceContext.set(workspacePath, promise)
  return promise
}

export async function getPackageContext(uri: Uri): Promise<PackageContext | undefined> {
  const folder = workspace.getWorkspaceFolder(uri)
  if (!folder)
    return

  const workspaceContext = await getWorkspaceContext(uri)
  if (!workspaceContext)
    return

  return findNearestPackageContext(workspaceContext, uri, normalize(folder.uri.path))
}

export async function warmWorkspaceContext(uri: Uri) {
  if (uri.scheme !== 'file' || !isSupportedDependencyDocument(uri))
    return

  await getWorkspaceContext(uri)
}
