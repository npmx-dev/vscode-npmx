import type { PackageInfo } from '#api/package'
import type { ResolvedDependencyInfo } from '#types/context'
import type { OffsetRange } from '#types/extractor'
import type { DiagnosticRule, RangeDiagnosticInfo } from '..'
import { config } from '#state'
import { checkIgnored } from '#utils/ignore'
import { npmxPackageUrl } from '#utils/links'
import { formatUpgradeVersion } from '#utils/version'
import gt from 'semver/functions/gt'
import lte from 'semver/functions/lte'
import prerelease from 'semver/functions/prerelease'
import { DiagnosticSeverity, Uri } from 'vscode'

export function resolveUpgrade(dep: ResolvedDependencyInfo, pkg: PackageInfo, resolvedVersion: string, ignoreList = config.ignore.upgrade) {
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

function createUpgradeDiagnostic(range: OffsetRange, name: string, targetVersion: string): RangeDiagnosticInfo {
  return {
    range,
    severity: DiagnosticSeverity.Hint,
    message: `"${name}" can be upgraded to ${targetVersion}.`,
    code: {
      value: 'upgrade',
      target: Uri.parse(npmxPackageUrl(name, targetVersion)),
    },
  }
}

export const checkUpgrade: DiagnosticRule = async ({ dep, pkg }) => {
  const resolvedVersion = await dep.resolvedVersion()
  if (!resolvedVersion)
    return

  const result = resolveUpgrade(dep, pkg, resolvedVersion)
  if (!result)
    return

  return createUpgradeDiagnostic(dep.specRange, dep.resolvedName, result)
}
