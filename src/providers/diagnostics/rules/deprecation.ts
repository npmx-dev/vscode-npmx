import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { formatPackageId } from '#utils/package'
import { DiagnosticSeverity, DiagnosticTag, Uri } from 'vscode'

export const checkDeprecation: DiagnosticRule = ({ dep, packageName, pkg, parsed, exactVersion }) => {
  if (!parsed || !exactVersion)
    return

  const versionInfo = pkg.versionsMeta[exactVersion]

  if (!versionInfo.deprecated)
    return

  return {
    node: dep.versionNode,
    message: `"${formatPackageId(packageName, exactVersion)}" has been deprecated: ${versionInfo.deprecated}`,
    severity: DiagnosticSeverity.Error,
    code: {
      value: 'deprecation',
      target: Uri.parse(npmxPackageUrl(packageName, parsed.version)),
    },
    tags: [DiagnosticTag.Deprecated],
  }
}
