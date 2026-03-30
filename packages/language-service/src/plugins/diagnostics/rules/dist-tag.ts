import type { DiagnosticSeverity } from '@volar/language-service'
import type { DiagnosticRule } from '../types'
import { npmxPackageUrl } from 'npmx-language-core/links'

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
    severity: 2 satisfies typeof DiagnosticSeverity.Warning,
    code: 'dist-tag',
    codeDescription: { href: npmxPackageUrl(resolvedName) },
  }
}
