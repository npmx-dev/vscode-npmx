import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { DiagnosticSeverity, Uri } from 'vscode'

export const checkDistTag: DiagnosticRule = async ({ dep, pkg }) => {
  const resolvedVersion = await dep.resolvedVersion()
  if (!resolvedVersion)
    return

  const tag = dep.resolvedSpec
  if (!Object.hasOwn(pkg.distTags, tag))
    return

  const { resolvedName } = dep

  return {
    range: dep.specRange,
    message: `"${resolvedName}" uses the "${tag}" version tag. This may lead to unexpected breaking changes. Consider pinning to a specific version.`,
    severity: DiagnosticSeverity.Warning,
    code: {
      value: 'dist-tag',
      target: Uri.parse(npmxPackageUrl(resolvedName)),
    },
  }
}
