import type { DependencyInfo } from '#types/extractor'
import type { ParsedVersion } from '#utils/version'
import type { DiagnosticRule, NodeDiagnosticInfo } from '..'
import { formatUpgradeVersion, isSupportedProtocol } from '#utils/version'
import lte from 'semver/functions/lte'
import prerelease from 'semver/functions/prerelease'
import gtr from 'semver/ranges/gtr'
import { DiagnosticSeverity } from 'vscode'

function createUpgradeDiagnostic(dep: DependencyInfo, parsed: ParsedVersion, target: string): NodeDiagnosticInfo {
  return {
    node: dep.versionNode,
    severity: DiagnosticSeverity.Hint,
    message: `New version available: ${formatUpgradeVersion(parsed, target)}`,
    code: 'upgrade',
  }
}

export const checkUpgrade: DiagnosticRule = ({ dep, pkg, parsed, exactVersion }) => {
  if (!parsed || !isSupportedProtocol(parsed.protocol))
    return

  const { version } = parsed
  if (Object.hasOwn(pkg.distTags, version))
    return

  const { latest } = pkg.distTags
  if (gtr(latest, version))
    return createUpgradeDiagnostic(dep, parsed, latest)

  if (!exactVersion)
    return

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
