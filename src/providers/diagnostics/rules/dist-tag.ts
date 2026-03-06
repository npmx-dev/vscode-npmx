import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { DiagnosticSeverity, Uri } from 'vscode'

export const checkDistTag: DiagnosticRule = ({ dep, name, pkg, parsed, exactVersion }) => {
  if (!parsed || !exactVersion)
    return

  const tag = parsed.version
  if (!Object.hasOwn(pkg.distTags, tag))
    return

  return {
    node: dep.versionNode,
    message: `"${name}" uses the "${tag}" version tag. This may lead to unexpected breaking changes. Consider pinning to a specific version.`,
    severity: DiagnosticSeverity.Warning,
    code: {
      value: 'dist-tag',
      target: Uri.parse(npmxPackageUrl(name)),
    },
  }
}
