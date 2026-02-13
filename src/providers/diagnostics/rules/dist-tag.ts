import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { isDistTagLike, isSupportedProtocol, parseVersion } from '#utils/version'
import { DiagnosticSeverity, Uri } from 'vscode'

export const checkDistTag: DiagnosticRule = (dep, pkg) => {
  const parsed = parseVersion(dep.version)
  if (!parsed || !isSupportedProtocol(parsed.protocol))
    return

  const tag = parsed.semver
  const isPublishedDistTag = tag in (pkg.distTags ?? {})
  const isDistTag = isPublishedDistTag || isDistTagLike(tag)
  if (!isDistTag)
    return

  return {
    node: dep.versionNode,
    message: `"${dep.name}" uses the "${tag}" version tag. This may lead to unexpected breaking changes. Consider pinning to a specific version.`,
    severity: DiagnosticSeverity.Warning,
    code: {
      value: 'dist-tag',
      target: Uri.parse(npmxPackageUrl(dep.name)),
    },
  }
}
