import type { OffsetRange } from '#types/range'
import type { DiagnosticRule, RangeDiagnosticInfo } from '..'
import { config } from '#state'
import { checkIgnored } from '#utils/ignore'
import { npmxPackageUrl } from '#utils/links'
import { formatUpgradeVersion } from '#utils/version'
import gt from 'semver/functions/gt'
import lte from 'semver/functions/lte'
import prerelease from 'semver/functions/prerelease'
import { DiagnosticSeverity, Uri } from 'vscode'

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

export const checkUpgrade: DiagnosticRule = ({ dep, name, pkg, exactVersion }) => {
  if (!exactVersion)
    return

  if (Object.hasOwn(pkg.distTags, dep.rawSpec))
    return

  const { latest } = pkg.distTags
  if (gt(latest, exactVersion)) {
    const targetVersion = formatUpgradeVersion(dep, latest)
    if (checkIgnored({ ignoreList: config.ignore.upgrade, name, version: targetVersion }))
      return
    return createUpgradeDiagnostic(dep.specRange, name, targetVersion)
  }

  const currentPreId = prerelease(exactVersion)?.[0]
  if (currentPreId == null)
    return

  for (const [tag, tagVersion] of Object.entries(pkg.distTags)) {
    if (tag === 'latest')
      continue
    if (prerelease(tagVersion)?.[0] !== currentPreId)
      continue
    if (lte(tagVersion, exactVersion))
      continue
    const targetVersion = formatUpgradeVersion(dep, tagVersion)
    if (checkIgnored({ ignoreList: config.ignore.upgrade, name, version: targetVersion }))
      continue

    return createUpgradeDiagnostic(dep.specRange, name, targetVersion)
  }
}
