import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { isSupportedProtocol } from '#utils/version'
import { DiagnosticSeverity, DiagnosticTag, Uri } from 'vscode'

export const checkDeprecation: DiagnosticRule = (dep, pkg, parsed) => {
  const { protocol, semver } = parsed

  if (!isSupportedProtocol(protocol))
    return

  const versionInfo = pkg.versionsMeta[semver]

  if (!versionInfo?.deprecated)
    return

  return {
    node: dep.versionNode,
    message: `${dep.name} v${semver} has been deprecated: ${versionInfo.deprecated}`,
    severity: DiagnosticSeverity.Error,
    code: {
      value: 'deprecation',
      target: Uri.parse(npmxPackageUrl(dep.name, semver)),
    },
    tags: [DiagnosticTag.Deprecated],
  }
}
