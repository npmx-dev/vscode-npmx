import type { DiagnosticRule } from '..'
import { UPGRADE_MESSAGE_PREFIX } from '#constants'
import { formatVersion, isSupportedProtocol, parseVersion } from '#utils/package'
import { DiagnosticSeverity } from 'vscode'

export const checkUpgrade: DiagnosticRule = (dep, pkg) => {
  const parsed = parseVersion(dep.version)
  if (!parsed || !isSupportedProtocol(parsed.protocol))
    return

  const { semver } = parsed
  const latest = pkg.distTags.latest
  if (latest === semver)
    return

  const target = formatVersion({ ...parsed, semver: latest })

  return {
    node: dep.versionNode,
    severity: DiagnosticSeverity.Hint,
    message: `${UPGRADE_MESSAGE_PREFIX}${target}`,
  }
}
