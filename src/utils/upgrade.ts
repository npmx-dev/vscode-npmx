import type { PackageInfo } from '#utils/api/package'
import gt from 'semver/functions/gt'
import lte from 'semver/functions/lte'
import prerelease from 'semver/functions/prerelease'

/**
 * Resolve the next upgrade target from npm dist-tags based on current exact version.
 * Mirrors the existing diagnostics upgrade rule behavior so other providers can reuse it.
 */
export function resolveUpgradeTargetVersion(pkg: PackageInfo, exactVersion: string): string | undefined {
  if (Object.hasOwn(pkg.distTags, exactVersion))
    return

  const { latest } = pkg.distTags
  if (gt(latest, exactVersion))
    return latest

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

    return tagVersion
  }
}
