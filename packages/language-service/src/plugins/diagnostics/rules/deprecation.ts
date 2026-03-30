import type { DiagnosticSeverity, DiagnosticTag } from '@volar/language-service'
import type { DiagnosticRule } from '../types'
import { npmxPackageUrl } from 'npmx-language-core/links'
import { checkIgnored, formatPackageId } from 'npmx-language-core/utils'

export const checkDeprecation: DiagnosticRule = async ({ dep, pkg }, ignoreList) => {
  const resolvedVersion = await dep.resolvedVersion()
  if (!resolvedVersion)
    return

  const versionInfo = pkg.versionsMeta[resolvedVersion]
  if (!versionInfo?.deprecated)
    return

  const { specRange, resolvedName, resolvedSpec } = dep
  if (checkIgnored({ ignoreList, name: resolvedName, version: resolvedVersion }))
    return

  return {
    range: specRange,
    message: `"${formatPackageId(resolvedName, resolvedVersion)}" has been deprecated: ${versionInfo.deprecated}`,
    severity: 1 satisfies typeof DiagnosticSeverity.Error,
    code: 'deprecation',
    codeDescription: { href: npmxPackageUrl(resolvedName, resolvedSpec) },
    tags: [2 satisfies typeof DiagnosticTag.Deprecated],
  }
}
