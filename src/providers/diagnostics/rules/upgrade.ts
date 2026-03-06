import type { ValidNode } from '#types/extractor'
import type { DiagnosticRule, NodeDiagnosticInfo } from '..'
import { config } from '#state'
import { checkIgnored } from '#utils/ignore'
import { npmxPackageUrl } from '#utils/links'
import { formatUpgradeVersion } from '#utils/version'
import gt from 'semver/functions/gt'
import lte from 'semver/functions/lte'
import prerelease from 'semver/functions/prerelease'
import { DiagnosticSeverity, Uri } from 'vscode'

function createUpgradeDiagnostic(node: ValidNode, packageName: string, targetVersion: string): NodeDiagnosticInfo {
  return {
    node,
    severity: DiagnosticSeverity.Hint,
    message: `"${packageName}" can be upgraded to ${targetVersion}.`,
    code: {
      value: 'upgrade',
      target: Uri.parse(npmxPackageUrl(packageName, targetVersion)),
    },
  }
}

export const checkUpgrade: DiagnosticRule = ({ dep, packageName, pkg, parsed, exactVersion }) => {
  if (!parsed || !exactVersion)
    return

  if (Object.hasOwn(pkg.distTags, exactVersion))
    return

  const { latest } = pkg.distTags
  if (gt(latest, exactVersion)) {
    const targetVersion = formatUpgradeVersion(parsed, latest)
    if (checkIgnored({ ignoreList: config.ignore.upgrade, name: dep.name, version: targetVersion }))
      return
    return createUpgradeDiagnostic(dep.versionNode, packageName, targetVersion)
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
    const targetVersion = formatUpgradeVersion(parsed, tagVersion)
    if (checkIgnored({ ignoreList: config.ignore.upgrade, name: dep.name, version: targetVersion }))
      continue

    return createUpgradeDiagnostic(dep.versionNode, packageName, targetVersion)
  }
}
