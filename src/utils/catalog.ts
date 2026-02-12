import type { CatalogResolutionInfo } from '#types/extractor'
import { PNPM_WORKSPACE_BASENAME } from '#constants'
import { logger } from '#state'
import { getCatalogsFromWorkspaceManifest } from '@pnpm/catalogs.config'
import { resolveFromCatalog } from '@pnpm/catalogs.resolver'
import { Location, Position, Range, Uri, workspace } from 'vscode'
import { isMap, isPair, isScalar, parseDocument } from 'yaml'
import { findNearestFile } from './resolve'

interface CatalogsWithLocations {
  catalogs: Record<string, Record<string, string>>
  entryLocations: Map<string, Location>
}

interface CatalogManifest {
  catalog?: Record<string, string>
  catalogs?: Record<string, Record<string, string>>
}

interface ResolveCatalogDependencyOptions {
  documentUri: Uri
  alias: string
  bareSpecifier: string
}

interface CatalogDependencyResolution extends CatalogResolutionInfo {
  resolvedSpecifier: string
}

const DEFAULT_CATALOG_NAME = 'default'

export async function findNearestWorkspaceYaml(documentUri: Uri): Promise<Uri | undefined> {
  // Start from parent dir, so we don't lookup "<file>/pnpm-workspace.yaml".
  const startDir = Uri.joinPath(documentUri, '..')
  return findNearestFile(PNPM_WORKSPACE_BASENAME, startDir)
}

export async function resolveCatalogDependency(options: ResolveCatalogDependencyOptions): Promise<CatalogDependencyResolution | undefined> {
  const workspaceUri = await findNearestWorkspaceYaml(options.documentUri)
  if (!workspaceUri)
    return

  const loaded = await loadCatalogsWithLocations(workspaceUri)
  if (!loaded)
    return

  const result = resolveFromCatalog(loaded.catalogs, {
    alias: options.alias,
    bareSpecifier: options.bareSpecifier,
  })

  if (result.type === 'misconfiguration') {
    logger.warn(`Invalid catalog configuration: ${result.error.message}`)
    return
  }

  if (result.type !== 'found')
    return

  const { catalogName, specifier } = result.resolution
  const entryLocation = loaded.entryLocations.get(toEntryKey(catalogName, options.alias))
  if (!entryLocation)
    return

  return {
    resolvedSpecifier: specifier,
    catalogName,
    workspaceUri,
    entryLocation,
  }
}

export async function loadCatalogsWithLocations(workspaceUri: Uri): Promise<CatalogsWithLocations | undefined> {
  const text = await readWorkspaceYaml(workspaceUri)
  if (!text)
    return

  const parsed = parseCatalogManifestWithLocations(workspaceUri, text)
  if (!parsed)
    return

  const catalogs = loadCatalogs(parsed.manifest, workspaceUri)
  if (!catalogs)
    return

  return { catalogs, entryLocations: parsed.entryLocations }
}

function loadCatalogs(manifest: CatalogManifest, workspaceUri: Uri): Record<string, Record<string, string>> | undefined {
  try {
    return normalizeCatalogs(getCatalogsFromWorkspaceManifest({
      catalog: manifest.catalog,
      catalogs: manifest.catalogs,
    }))
  } catch (error) {
    logger.warn(`Invalid catalog configuration in ${workspaceUri.toString()}: ${error}`)
  }
}

async function readWorkspaceYaml(workspaceUri: Uri): Promise<string | undefined> {
  try {
    const content = await workspace.fs.readFile(workspaceUri)
    return new TextDecoder().decode(content)
  } catch (error) {
    logger.warn(`Failed to read ${workspaceUri.toString()}: ${error}`)
  }
}

function parseCatalogManifestWithLocations(
  workspaceUri: Uri,
  text: string,
): { manifest: CatalogManifest, entryLocations: Map<string, Location> } | undefined {
  const doc = parseDocument(text)
  if (doc.errors.length > 0) {
    logger.warn(`Invalid YAML in ${workspaceUri.toString()}: ${doc.errors.map((e) => e.message).join('; ')}`)
    return
  }

  const root = doc.contents
  if (!isMap(root)) {
    return {
      manifest: {},
      entryLocations: new Map<string, Location>(),
    }
  }

  const offsetToPosition = createOffsetToPosition(text)
  const entryLocations = new Map<string, Location>()
  const manifest: CatalogManifest = {}

  const defaultCatalog = root.items.find((i) => isScalar(i.key) && i.key.value === 'catalog')
  const defaultCatalogEntries = loadCatalogEntries(defaultCatalog, DEFAULT_CATALOG_NAME, workspaceUri, entryLocations, offsetToPosition)
  if (defaultCatalogEntries)
    manifest.catalog = defaultCatalogEntries

  const catalogsNode = root.items.find((i) => isScalar(i.key) && i.key.value === 'catalogs')
  if (isPair(catalogsNode) && isMap(catalogsNode.value)) {
    const namedCatalogs: Record<string, Record<string, string>> = {}

    for (const catalog of catalogsNode.value.items) {
      if (!isScalar(catalog.key))
        continue

      const catalogName = String(catalog.key.value)
      const entries = loadCatalogEntries(catalog, catalogName, workspaceUri, entryLocations, offsetToPosition)
      if (entries)
        namedCatalogs[catalogName] = entries
    }

    manifest.catalogs = namedCatalogs
  }

  return { manifest, entryLocations }
}

function loadCatalogEntries(
  catalog: unknown,
  catalogName: string,
  workspaceUri: Uri,
  entryLocations: Map<string, Location>,
  offsetToPosition: (offset: number) => Position,
): Record<string, string> | undefined {
  if (!isPair(catalog))
    return
  if (!isMap(catalog.value))
    return

  const entries: Record<string, string> = {}

  for (const item of catalog.value.items) {
    if (!isScalar(item.key) || !isScalar(item.value))
      continue

    const alias = String(item.key.value)
    const specifier = String(item.value.value)
    entries[alias] = specifier

    const range = item.value.range
    if (!range)
      continue

    const [start, end] = range
    const location = new Location(
      workspaceUri,
      new Range(offsetToPosition(start), offsetToPosition(end)),
    )
    entryLocations.set(toEntryKey(catalogName, alias), location)
  }

  return entries
}

function normalizeCatalogs(value: unknown): Record<string, Record<string, string>> {
  const normalized: Record<string, Record<string, string>> = {}
  if (!value || typeof value !== 'object')
    return normalized

  for (const [catalogName, catalog] of Object.entries(value as Record<string, unknown>)) {
    if (!catalog || typeof catalog !== 'object')
      continue

    const entries: Record<string, string> = {}
    for (const [alias, specifier] of Object.entries(catalog as Record<string, unknown>)) {
      if (typeof specifier === 'string')
        entries[alias] = specifier
    }

    if (Object.keys(entries).length > 0)
      normalized[catalogName] = entries
  }

  return normalized
}

function toEntryKey(catalogName: string, alias: string): string {
  return `${catalogName}\0${alias}`
}

function createOffsetToPosition(text: string): (offset: number) => Position {
  const lineOffsets = [0]
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10)
      lineOffsets.push(i + 1)
  }

  return (offset: number) => {
    const clampedOffset = Math.max(0, Math.min(offset, text.length))
    let low = 0
    let high = lineOffsets.length - 1

    while (low <= high) {
      const mid = (low + high) >> 1
      const start = lineOffsets[mid]
      const next = lineOffsets[mid + 1] ?? Number.POSITIVE_INFINITY
      if (clampedOffset < start)
        high = mid - 1
      else if (clampedOffset >= next)
        low = mid + 1
      else
        return new Position(mid, clampedOffset - start)
    }

    const line = lineOffsets.length - 1
    const lineStart = lineOffsets[line]
    return new Position(line, clampedOffset - lineStart)
  }
}
