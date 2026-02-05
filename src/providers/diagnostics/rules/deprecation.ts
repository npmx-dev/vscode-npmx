import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { parseVersion } from '#utils/package'
import { DiagnosticSeverity, DiagnosticTag, Uri } from 'vscode'

export const checkDeprecation: DiagnosticRule = (dep, pkg) => {
  const parsed = parseVersion(dep.version)
  if (!parsed)
    return

  const { version } = parsed
  const versionInfo = pkg.versionsMeta[version]

  if (!versionInfo?.deprecated)
    return

  return {
    node: dep.versionNode,
    message: `${dep.name} v${version} has been deprecated: ${versionInfo.deprecated}`,
    severity: DiagnosticSeverity.Error,
    code: {
      value: 'deprecation',
      target: Uri.parse(npmxPackageUrl(dep.name, version)),
    },
    tags: [DiagnosticTag.Deprecated],
  }
}
