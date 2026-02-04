import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { extractVersion } from '#utils/package'
import { DiagnosticSeverity, Uri } from 'vscode'

export const checkDeprecation: DiagnosticRule = (dep, pkg) => {
  const exactVersion = extractVersion(dep.version)
  const versionInfo = pkg.versionsMeta[exactVersion]

  if (!versionInfo?.deprecated)
    return

  return {
    node: dep.versionNode,
    message: `${dep.name} v${exactVersion} has been deprecated: ${versionInfo.deprecated}`,
    severity: DiagnosticSeverity.Error,
    code: {
      value: 'deprecation',
      target: Uri.parse(npmxPackageUrl(dep.name, exactVersion)),
    },
  }
}
