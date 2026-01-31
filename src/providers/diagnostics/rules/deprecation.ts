import type { DiagnosticRule } from '..'
import { extractVersion } from '#utils/version'
import { DiagnosticSeverity } from 'vscode'

export const checkDeprecations: DiagnosticRule = (dep, pkg) => {
  const exactVersion = extractVersion(dep.version)
  const versionInfo = pkg.versions[exactVersion]

  if (!versionInfo?.deprecated)
    return

  return {
    node: dep.versionNode,
    message: `${dep.name} v${exactVersion} has been deprecated: ${versionInfo.deprecated}`,
    severity: DiagnosticSeverity.Error,
  }
}
