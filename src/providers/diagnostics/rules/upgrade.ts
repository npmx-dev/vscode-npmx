import type { ValidNode } from '#types/extractor'
import type { ParsedVersion } from '#utils/version'
import type { DiagnosticRule, NodeDiagnosticInfo } from '..'
import { config } from '#state'
import { checkIgnored } from '#utils/ignore'
import { npmxPackageUrl } from '#utils/links'
import { formatUpgradeVersion } from '#utils/version'
import gt from 'semver/functions/gt'
import lte from 'semver/functions/lte'
import prerelease from 'semver/functions/prerelease'
import { DiagnosticSeverity, Uri } from 'vscode'

export interface ResolveUpgradeOptions {
  name: string
  version: string
  parsed: ParsedVersion
  exactVersion: string
  distTags: Record<string, string>
  ignoreList: string[]
}

export interface UpgradeResult {
  name: string
  targetVersion: string
}

export function resolveUpgrade(options: ResolveUpgradeOptions): UpgradeResult | undefined {
  const { name, version, parsed, exactVersion, distTags, ignoreList } = options

  if (Object.hasOwn(distTags, version))
    return

  const { latest } = distTags
  if (gt(latest, exactVersion)) {
    const targetVersion = formatUpgradeVersion(parsed, latest)
    if (checkIgnored({ ignoreList, name, version: targetVersion }))
      return
    return { name, targetVersion }
  }

  const currentPreId = prerelease(exactVersion)?.[0]
  if (currentPreId == null)
    return

  for (const [tag, tagVersion] of Object.entries(distTags)) {
    if (tag === 'latest')
      continue
    if (prerelease(tagVersion)?.[0] !== currentPreId)
      continue
    if (lte(tagVersion, exactVersion))
      continue
    const targetVersion = formatUpgradeVersion(parsed, tagVersion)
    if (checkIgnored({ ignoreList, name, version: targetVersion }))
      continue

    return { name, targetVersion }
  }
}

function createUpgradeDiagnostic(node: ValidNode, name: string, targetVersion: string): NodeDiagnosticInfo {
  return {
    node,
    severity: DiagnosticSeverity.Hint,
    message: `"${name}" can be upgraded to ${targetVersion}.`,
    code: {
      value: 'upgrade',
      target: Uri.parse(npmxPackageUrl(name, targetVersion)),
    },
  }
}

export const checkUpgrade: DiagnosticRule = ({ dep, name, pkg, parsed, exactVersion }) => {
  if (!parsed || !exactVersion)
    return

  const result = resolveUpgrade({
    name,
    version: dep.version,
    parsed,
    exactVersion,
    distTags: pkg.distTags,
    ignoreList: config.ignore.upgrade,
  })

  if (result)
    return createUpgradeDiagnostic(dep.versionNode, result.name, result.targetVersion)
}
