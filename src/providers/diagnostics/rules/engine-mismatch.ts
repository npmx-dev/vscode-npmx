import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
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
  packageEngines: Record<string, string>,
  dependencyEngines: Record<string, string>,
) {
  const mismatches: EngineMismatch[] = []

  for (const [engine, dependencyRange] of Object.entries(dependencyEngines)) {
    const packageRange = packageEngines[engine]
    if (typeof packageRange !== 'string')
      continue

    try {
      if (subset(packageRange, dependencyRange))
        continue

      mismatches.push({
        engine,
        packageRange,
        dependencyRange,
        hasIntersection: intersects(packageRange, dependencyRange),
      })
    }
    // HACK: engines fields can contain non-standard values (e.g., "lts"), skip silently
    catch {}
  }

  return mismatches
}

export const checkEngineMismatch: DiagnosticRule = ({ dep, pkg, exactVersion, engines }) => {
  if (!exactVersion || !engines)
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
    message: `Engines mismatch for "${dep.name}@${exactVersion}": ${mismatchDetails}.`,
    severity: DiagnosticSeverity.Warning,
    code: {
      value: 'engine-mismatch',
      target: Uri.parse(npmxPackageUrl(dep.name, exactVersion)),
    },
  }
}
