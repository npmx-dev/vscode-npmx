import type { DiagnosticRule } from '..'
import { isSupportedProtocol, parseVersion } from '#utils/package'
import { DiagnosticSeverity } from 'vscode'

export const checkUpgrade: DiagnosticRule = (dep, pkg) => {
  const parsed = parseVersion(dep.version)
  if (!parsed || !isSupportedProtocol(parsed.protocol))
    return

  const { semver } = parsed
  if (pkg.distTags.latest === semver)
    return

  return {
    node: dep.versionNode,
    severity: DiagnosticSeverity.Hint,
    message: 'New version is avaliable',
  }
}
