import type { DependencyInfo } from '#types/extractor'
import type { ParsedVersion } from '#utils/version'
import type { DiagnosticRule, NodeDiagnosticInfo } from '..'
import { formatVersion, isSupportedProtocol, parseVersion } from '#utils/version'
import prerelease from 'semver/functions/prerelease'
import gtr from 'semver/ranges/gtr'
import ltr from 'semver/ranges/ltr'
import { DiagnosticSeverity } from 'vscode'

function createUpgradeDiagnostic(dep: DependencyInfo, parsed: ParsedVersion, upgradeVersion: string): NodeDiagnosticInfo {
  const target = formatVersion({ ...parsed, semver: upgradeVersion })
  return {
    node: dep.versionNode,
    severity: DiagnosticSeverity.Hint,
    message: `New version available: ${target}`,
    code: 'upgrade',
  }
}

export const checkUpgrade: DiagnosticRule = (dep, pkg) => {
  const parsed = parseVersion(dep.version)
  if (!parsed || !isSupportedProtocol(parsed.protocol))
    return

  const { semver } = parsed
  const latest = pkg.distTags.latest

  if (latest && gtr(latest, semver))
    return createUpgradeDiagnostic(dep, parsed, latest)

  const currentPreId = prerelease(semver)?.[0]
  if (currentPreId == null)
    return

  for (const [tag, tagVersion] of Object.entries(pkg.distTags)) {
    if (tag === 'latest')
      continue
    if (prerelease(tagVersion)?.[0] !== currentPreId)
      continue
    if (ltr(tagVersion, semver))
      continue

    return createUpgradeDiagnostic(dep, parsed, tagVersion)
  }
}
