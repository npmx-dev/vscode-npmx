import type { DiagnosticRule } from '..'
import { config } from '#state'
import { checkIgnored } from '#utils/ignore'
import { npmxPackageUrl } from '#utils/links'
import { formatPackageId } from '#utils/package'
import { DiagnosticSeverity, DiagnosticTag, Uri } from 'vscode'

export const checkDeprecation: DiagnosticRule = ({ dep, pkg, parsed, exactVersion }) => {
  if (!parsed || !exactVersion)
    return

  const versionInfo = pkg.versionsMeta[exactVersion]

  if (!versionInfo.deprecated)
    return

  if (checkIgnored({ ignoreList: config.ignore.deprecation, name: dep.name, version: exactVersion }))
    return

  return {
    node: dep.versionNode,
    message: `"${formatPackageId(dep.name, exactVersion)}" has been deprecated: ${versionInfo.deprecated}`,
    severity: DiagnosticSeverity.Error,
    code: {
      value: 'deprecation',
      target: Uri.parse(npmxPackageUrl(dep.name, parsed.version)),
    },
    tags: [DiagnosticTag.Deprecated],
  }
}
