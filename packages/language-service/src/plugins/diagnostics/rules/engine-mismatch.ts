import type { DiagnosticSeverity } from '@volar/language-service'
import type { Engines } from 'npmx-language-core/types'
import type { DiagnosticRule } from '../types'
import { npmxPackageUrl } from 'npmx-language-core/links'
import { formatPackageId, isPackageManifest } from 'npmx-language-core/utils'
import SemverRange from 'semver/classes/range'
import intersects from 'semver/ranges/intersects'
import subset from 'semver/ranges/subset'
import { URI } from 'vscode-uri'

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
      const pkgRange = new SemverRange(packageRangeStr)
      const depRange = new SemverRange(dependencyRangeStr)

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

export const checkEngineMismatch: DiagnosticRule = async ({ uri, dep, pkg, workspace }) => {
  const path = URI.parse(uri).path

  if (!isPackageManifest(path))
    return
  if (dep.category !== 'dependencies')
    return

  const resolvedVersion = await dep.resolvedVersion()
  if (!resolvedVersion)
    return

  const wsCtx = await workspace.getWorkspaceContext(uri)
  const engines = (await wsCtx?.loadPackageManifestInfo(path))?.engines
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
    severity: 2 satisfies typeof DiagnosticSeverity.Warning,
    code: 'engine-mismatch',
    codeDescription: { href: npmxPackageUrl(resolvedName, resolvedSpec) },
  }
}
