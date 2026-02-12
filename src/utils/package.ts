import type { DependencyInfo } from '#types/extractor'
import type { Uri } from 'vscode'
import type { ParsedVersion } from './version'
import { resolvePnpmCatalogs } from './catalog'
import { parseVersion } from './version'

/**
 * Encode a package name for use in npm registry URLs.
 * Handles scoped packages (e.g., @scope/name -> @scope%2Fname).
 */
export function encodePackageName(name: string): string {
  if (name.startsWith('@')) {
    return `@${encodeURIComponent(name.slice(1))}`
  }
  return encodeURIComponent(name)
}

export interface ResolvedPackage extends ParsedVersion {
  catalogName?: string
}

export async function resolvePackage(documentUri: Uri, dep: DependencyInfo): Promise<ResolvedPackage | undefined> {
  const parsed = parseVersion(dep.version)
  if (!parsed)
    return

  if (parsed.protocol === 'catalog') {
    const catalogs = await resolvePnpmCatalogs(documentUri)
    const name = parsed.semver || 'default'
    const resolved = catalogs?.[name]?.[dep.name]
    if (!resolved)
      return

    const resolvedParsed = parseVersion(resolved)
    if (!resolvedParsed)
      return

    return { ...resolvedParsed, catalogName: parsed.semver }
  }

  return { ...parsed }
}
