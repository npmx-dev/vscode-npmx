import type { Engines } from 'fast-npm-meta'
import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { formatPackageId } from '#utils/package'
import Range from 'semver/classes/range'
import intersects from 'semver/ranges/intersects'
import subset from 'semver/ranges/subset'
import { DiagnosticSeverity, Uri } from 'vscode'

interface EngineMismatch {
  engine: string
  packageRange: string
  dependencyRange: string
  hasIntersection: boolean
}

function resolveEngineMismatches(
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

export const checkEngineMismatch: DiagnosticRule = ({ dep, name, pkg, parsed, exactVersion, engines }) => {
  if (!parsed || !exactVersion || !engines)
    return

  const dependencyEngines = pkg.versionsMeta[exactVersion]?.engines
  if (!dependencyEngines)
    return

  const mismatches = resolveEngineMismatches(engines, dependencyEngines)
  if (mismatches.length === 0)
    return

  const mismatchDetails = mismatches
    .map((mismatch) => `${mismatch.engine}: requires "${mismatch.dependencyRange}", but package supports "${mismatch.packageRange}"${mismatch.hasIntersection ? ' (partial overlap)' : ''}`)
    .join('; ')

  return {
    node: dep.versionNode,
    message: `Engines mismatch for "${formatPackageId(name, exactVersion)}": ${mismatchDetails}.`,
    severity: DiagnosticSeverity.Warning,
    code: {
      value: 'engine-mismatch',
      target: Uri.parse(npmxPackageUrl(name, parsed.version)),
    },
  }
}
