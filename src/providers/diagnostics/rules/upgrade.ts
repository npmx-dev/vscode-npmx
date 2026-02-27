import type { DependencyInfo } from '#types/extractor'
import type { ParsedVersion } from '#utils/version'
import type { DiagnosticRule, NodeDiagnosticInfo } from '..'
import { npmxPackageUrl } from '#utils/links'
import { formatUpgradeVersion } from '#utils/version'
import gt from 'semver/functions/gt'
import lte from 'semver/functions/lte'
import prerelease from 'semver/functions/prerelease'
import { DiagnosticSeverity, Uri } from 'vscode'

function createUpgradeDiagnostic(dep: DependencyInfo, parsed: ParsedVersion, target: string): NodeDiagnosticInfo {
  return {
    node: dep.versionNode,
    severity: DiagnosticSeverity.Hint,
    message: `New version available: ${formatUpgradeVersion(parsed, target)}`,
    code: {
      value: 'upgrade',
      target: Uri.parse(npmxPackageUrl(dep.name, target)),
    },
  }
}

export const checkUpgrade: DiagnosticRule = ({ dep, pkg, parsed, exactVersion }) => {
  if (!parsed || !exactVersion)
    return

  if (Object.hasOwn(pkg.distTags, exactVersion))
    return

  const { latest } = pkg.distTags
  if (gt(latest, exactVersion))
    return createUpgradeDiagnostic(dep, parsed, latest)

  const currentPreId = prerelease(exactVersion)?.[0]
  if (currentPreId == null)
    return

  for (const [tag, tagVersion] of Object.entries(pkg.distTags)) {
    if (tag === 'latest')
      continue
    if (prerelease(tagVersion)?.[0] !== currentPreId)
      continue
    if (lte(tagVersion, exactVersion))
      continue

    return createUpgradeDiagnostic(dep, parsed, tagVersion)
  }
}
