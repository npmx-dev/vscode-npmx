import type { DiagnosticSeverity } from '@volar/language-service'
import type { PackageInfo } from 'npmx-language-core/api/package'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import type { DiagnosticRule } from '../types'
import { npmxPackageUrl } from 'npmx-language-core/links'
import { checkIgnored } from 'npmx-language-core/utils'
import gt from 'semver/functions/gt'
import lte from 'semver/functions/lte'
import prerelease from 'semver/functions/prerelease'
import { formatUpgradeVersion } from '../../../utils/version'

export function resolveUpgrade(dep: DependencyInfo, pkg: PackageInfo, resolvedVersion: string, ignoreList: string[]) {
  const { distTags } = pkg
  if (Object.hasOwn(distTags, dep.resolvedSpec))
    return

  const { latest } = distTags
  const { resolvedName } = dep

  if (gt(latest, resolvedVersion)) {
    const targetVersion = formatUpgradeVersion(dep, latest)
    if (checkIgnored({ ignoreList, name: resolvedName, version: targetVersion }))
      return

    return targetVersion
  }

  const currentPreId = prerelease(resolvedVersion)?.[0]
  if (currentPreId == null)
    return

  for (const [tag, tagVersion] of Object.entries(distTags)) {
    if (tag === 'latest')
      continue
    if (prerelease(tagVersion)?.[0] !== currentPreId)
      continue
    if (lte(tagVersion, resolvedVersion))
      continue
    const targetVersion = formatUpgradeVersion(dep, tagVersion)
    if (checkIgnored({ ignoreList, name: resolvedName, version: targetVersion }))
      continue

    return targetVersion
  }
}

export const checkUpgrade: DiagnosticRule = async ({ dep, pkg }, ignoreList) => {
  const resolvedVersion = await dep.resolvedVersion()
  if (!resolvedVersion)
    return

  const targetVersion = resolveUpgrade(dep, pkg, resolvedVersion, ignoreList)
  if (!targetVersion)
    return

  return {
    range: dep.specRange,
    severity: 4 satisfies typeof DiagnosticSeverity.Hint,
    message: `"${dep.resolvedName}" can be upgraded to ${targetVersion}.`,
    code: 'upgrade',
    codeDescription: { href: npmxPackageUrl(dep.resolvedName, targetVersion) },
  }
}
