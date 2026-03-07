import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { DiagnosticSeverity, Uri } from 'vscode'

export const checkDistTag: DiagnosticRule = ({ dep, name, pkg, exactVersion }) => {
  if (!exactVersion)
    return

  const tag = dep.resolvedSpec
  if (!Object.hasOwn(pkg.distTags, tag))
    return

  return {
    range: dep.specRange,
    message: `"${name}" uses the "${tag}" version tag. This may lead to unexpected breaking changes. Consider pinning to a specific version.`,
    severity: DiagnosticSeverity.Warning,
    code: {
      value: 'dist-tag',
      target: Uri.parse(npmxPackageUrl(name)),
    },
  }
}
