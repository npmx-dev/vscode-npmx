import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { isSupportedProtocol, parseVersion } from '#utils/version'
import maxSatisfying from 'semver/ranges/max-satisfying'
import { DiagnosticSeverity, DiagnosticTag, Uri } from 'vscode'

export const checkDeprecation: DiagnosticRule = (dep, pkg) => {
  const parsed = parseVersion(dep.version)
  if (!parsed || !isSupportedProtocol(parsed.protocol))
    return

  const version = maxSatisfying(Object.keys(pkg.versionsMeta), parsed.semver)

  if (!version)
    return

  const versionInfo = pkg.versionsMeta[version]

  if (!versionInfo.deprecated)
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
