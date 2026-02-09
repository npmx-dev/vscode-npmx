import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { isSupportedProtocol, parseVersion } from '#utils/version'
import { DiagnosticSeverity, DiagnosticTag, Uri } from 'vscode'

export const checkDeprecation: DiagnosticRule = (dep, pkg) => {
  const parsed = parseVersion(dep.version)
  if (!parsed || !isSupportedProtocol(parsed.protocol))
    return

  const { semver } = parsed
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
