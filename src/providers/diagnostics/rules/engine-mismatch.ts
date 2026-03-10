import type { Engines } from 'fast-npm-meta'
import type { DiagnosticRule } from '..'
import { getWorkspaceContext } from '#core/workspace'
import { isPackageManifestPath } from '#utils/file'
import { npmxPackageUrl } from '#utils/links'
import { formatPackageId } from '#utils/package'
import Range from 'semver/classes/range'
import intersects from 'semver/ranges/intersects'
import subset from 'semver/ranges/subset'
import { DiagnosticSeverity, Uri } from 'vscode'

export interface EngineMismatch {
  engine: string
  packageRange: string
  dependencyRange: string
  hasIntersection: boolean
}

export function resolveEngineMismatches(
  packageEngines: Engines,
  dependencyEngines: Engines,
) {
  const mismatches: EngineMismatch[] = []

  for (const [engine, dependencyRangeStr] of Object.entries(dependencyEngines)) {
    const packageRangeStr = packageEngines[engine]
    if (!packageRangeStr || !dependencyRangeStr)
      continue

    try {
      const pkgRange = new Range(packageRangeStr)
      const depRange = new Range(dependencyRangeStr)

      if (subset(pkgRange, depRange))
        continue

      mismatches.push({
        engine,
        packageRange: packageRangeStr,
        dependencyRange: dependencyRangeStr,
        hasIntersection: intersects(pkgRange, depRange),
      })
    } catch {
      continue
    }
  }

  return mismatches
}

export const checkEngineMismatch: DiagnosticRule = async ({ uri, dep, pkg }) => {
  if (!isPackageManifestPath(uri.path))
    return
  if (dep.category !== 'dependencies')
    return

  const resolvedVersion = await dep.resolvedVersion()
  if (!resolvedVersion)
    return

  const ctx = await getWorkspaceContext(uri)
  const engines = (await ctx?.loadPackageManifestInfo(uri))?.engines

  if (!engines)
    return

  const { specRange, resolvedName, resolvedSpec } = dep

  const dependencyEngines = pkg.versionsMeta[resolvedVersion]?.engines
  if (!dependencyEngines)
    return

  const mismatches = resolveEngineMismatches(engines, dependencyEngines)
  if (mismatches.length === 0)
    return

  const mismatchDetails = mismatches
    .map((mismatch) => `${mismatch.engine}: requires "${mismatch.dependencyRange}", but package supports "${mismatch.packageRange}"${mismatch.hasIntersection ? ' (partial overlap)' : ''}`)
    .join('; ')

  return {
    range: specRange,
    message: `Engines mismatch for "${formatPackageId(resolvedName, resolvedVersion)}": ${mismatchDetails}.`,
    severity: DiagnosticSeverity.Warning,
    code: {
      value: 'engine-mismatch',
      target: Uri.parse(npmxPackageUrl(resolvedName, resolvedSpec)),
    },
  }
}
