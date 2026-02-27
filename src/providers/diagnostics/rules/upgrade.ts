import type { DiagnosticRule } from '..'
import { npmxPackageUrl } from '#utils/links'
import { resolveUpgradeTargetVersion } from '#utils/upgrade'
import { formatUpgradeVersion } from '#utils/version'
import { DiagnosticSeverity, Uri } from 'vscode'

export const checkUpgrade: DiagnosticRule = ({ dep, pkg, parsed, exactVersion }) => {
  if (!parsed || !exactVersion)
    return

  const target = resolveUpgradeTargetVersion(pkg, exactVersion)
  if (!target)
    return

  return {
    node: dep.versionNode,
    severity: DiagnosticSeverity.Hint,
    message: `New version available: ${formatUpgradeVersion(parsed, target)}`,
    code: {
      value: 'upgrade',
      target: Uri.parse(npmxPackageUrl(dep.name, target)),
    },
  }
}
