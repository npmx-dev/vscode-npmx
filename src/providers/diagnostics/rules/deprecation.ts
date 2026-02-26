import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { resolveExactVersion } from '#utils/package'
import { isSupportedProtocol, parseVersion } from '#utils/version'
import { DiagnosticSeverity, DiagnosticTag, Uri } from 'vscode'

export const checkDeprecation: DiagnosticRule = (dep, pkg) => {
  const parsed = parseVersion(dep.version)
  if (!parsed || !isSupportedProtocol(parsed.protocol))
    return

  const exactVersion = resolveExactVersion(pkg, parsed.version)

  if (!exactVersion)
    return

  const versionInfo = pkg.versionsMeta[exactVersion]

  if (!versionInfo.deprecated)
    return

  return {
    node: dep.versionNode,
    message: `${dep.name} v${exactVersion} has been deprecated: ${versionInfo.deprecated}`,
    severity: DiagnosticSeverity.Error,
    code: {
      value: 'deprecation',
      target: Uri.parse(npmxPackageUrl(dep.name, parsed.version)),
    },
    tags: [DiagnosticTag.Deprecated],
  }
}
