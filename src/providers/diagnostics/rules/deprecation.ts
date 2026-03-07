import type { DiagnosticRule } from '..'
import { config } from '#state'
import { checkIgnored } from '#utils/ignore'
import { npmxPackageUrl } from '#utils/links'
import { formatPackageId } from '#utils/package'
import { DiagnosticSeverity, DiagnosticTag, Uri } from 'vscode'

export const checkDeprecation: DiagnosticRule = ({ dep, pkg, exactVersion }) => {
  if (!exactVersion)
    return

  const versionInfo = pkg.versionsMeta[exactVersion]

  if (!versionInfo.deprecated)
    return

  const { resolvedName } = dep

  if (checkIgnored({ ignoreList: config.ignore.deprecation, name: resolvedName, version: exactVersion }))
    return

  return {
    range: dep.specRange,
    message: `"${formatPackageId(resolvedName, exactVersion)}" has been deprecated: ${versionInfo.deprecated}`,
    severity: DiagnosticSeverity.Error,
    code: {
      value: 'deprecation',
      target: Uri.parse(npmxPackageUrl(resolvedName, dep.resolvedSpec)),
    },
    tags: [DiagnosticTag.Deprecated],
  }
}
