import type { DependencyInfo } from '#types/extractor'
import type { ParsedVersion } from '#utils/version'
import type { DiagnosticRule, NodeDiagnosticInfo } from '..'
import { UPGRADE_MESSAGE_PREFIX } from '#constants'
import { formatVersion, getPrereleaseId, isSupportedProtocol, lt } from '#utils/version'
import { DiagnosticSeverity } from 'vscode'

function createUpgradeDiagnostic(dep: DependencyInfo, parsed: ParsedVersion, upgradeVersion: string): NodeDiagnosticInfo {
  const target = formatVersion({ ...parsed, semver: upgradeVersion })
  return {
    node: dep.versionNode,
    severity: DiagnosticSeverity.Hint,
    message: `${UPGRADE_MESSAGE_PREFIX}${target}`,
  }
}

export const checkUpgrade: DiagnosticRule = (dep, pkg, parsed) => {
  if (!isSupportedProtocol(parsed.protocol))
    return

  const { semver } = parsed
  const latest = pkg.distTags.latest

  if (latest && lt(semver, latest))
    return createUpgradeDiagnostic(dep, parsed, latest)

  const currentPreId = getPrereleaseId(semver)
  if (!currentPreId)
    return

  for (const [tag, tagVersion] of Object.entries(pkg.distTags)) {
    if (tag === 'latest')
      continue
    if (getPrereleaseId(tagVersion) !== currentPreId)
      continue
    if (!lt(semver, tagVersion))
      continue

    return createUpgradeDiagnostic(dep, parsed, tagVersion)
  }
}
