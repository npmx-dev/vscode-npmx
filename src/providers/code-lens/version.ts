import type { DependencyInfo, Extractor } from '#types/extractor'
import type { CodeLensProvider, TextDocument } from 'vscode'
import { internalCommands } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { resolveExactVersion } from '#utils/package'
import { resolveUpgradeTargetVersion } from '#utils/upgrade'
import { formatUpgradeVersion, isSupportedProtocol, parseVersion } from '#utils/version'
import { debounce } from 'perfect-debounce'
import diff from 'semver/functions/diff'
import { CodeLens, EventEmitter } from 'vscode'

const dataMap = new WeakMap<CodeLens, DependencyInfo>()

export class VersionCodeLensProvider<T extends Extractor> implements CodeLensProvider {
  extractor: T
  private readonly onDidChangeCodeLensesEmitter = new EventEmitter<void>()
  readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event
  private readonly scheduleRefresh = debounce(() => {
    this.onDidChangeCodeLensesEmitter.fire()
  }, 100, { leading: false, trailing: true })

  constructor(extractor: T) {
    this.extractor = extractor
  }

  provideCodeLenses(document: TextDocument): CodeLens[] {
    const root = this.extractor.parse(document)
    if (!root)
      return []

    const deps = this.extractor.getDependenciesInfo(root)
    const lenses: CodeLens[] = []

    for (const dep of deps) {
      const versionRange = this.extractor.getNodeRange(document, dep.versionNode)
      const lens = new CodeLens(versionRange)
      dataMap.set(lens, dep)
      lenses.push(lens)
    }

    return lenses
  }

  resolveCodeLens(lens: CodeLens) {
    const dep = dataMap.get(lens)
    if (!dep)
      return lens

    const parsed = parseVersion(dep.version)
    if (!parsed || !isSupportedProtocol(parsed.protocol)) {
      lens.command = { title: '$(question) unknown', command: '' }
      return lens
    }

    const pkg = getPackageInfo(dep.name)
    if (pkg instanceof Promise) {
      lens.command = { title: '$(sync~spin) checking...', command: '' }
      pkg.finally(() => this.scheduleRefresh())
      return lens
    }

    if (!pkg) {
      lens.command = { title: '$(question) unknown', command: '' }
      return lens
    }

    const exactVersion = resolveExactVersion(pkg, parsed.version)
    if (!exactVersion) {
      lens.command = { title: '$(question) unknown', command: '' }
      return lens
    }

    const targetVersion = resolveUpgradeTargetVersion(pkg, exactVersion)
    if (!targetVersion) {
      lens.command = { title: '$(check) latest', command: '' }
      return lens
    }

    const newVersion = formatUpgradeVersion(parsed, targetVersion)
    const updateType = diff(exactVersion, targetVersion)
    lens.command = {
      title: updateType
        ? `$(arrow-up) ${newVersion} (${updateType})`
        : `$(arrow-up) ${newVersion}`,
      command: internalCommands.replaceText,
      arguments: [lens.range, newVersion],
    }

    return lens
  }
}
