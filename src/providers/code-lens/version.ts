import type { DependencyInfo, Extractor } from '#types/extractor'
import type { CodeLensProvider, Range, TextDocument } from 'vscode'
import { getPackageInfo } from '#utils/api/package'
import { formatVersion, isSupportedProtocol, parseVersion } from '#utils/package'
import { getUpdateType } from '#utils/semver'
import { debounce } from 'perfect-debounce'
import { CodeLens, EventEmitter } from 'vscode'
import { commands } from '../../generated-meta'

interface LensData {
  dep: DependencyInfo
  versionRange: Range
  uri: TextDocument['uri']
}

const dataMap = new WeakMap<CodeLens, LensData>()

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
      const parsed = parseVersion(dep.version)
      if (!parsed || !isSupportedProtocol(parsed.protocol))
        continue

      const versionRange = this.extractor.getNodeRange(document, dep.versionNode)
      const lens = new CodeLens(versionRange)
      dataMap.set(lens, { dep, versionRange, uri: document.uri })
      lenses.push(lens)
    }

    return lenses
  }

  resolveCodeLens(lens: CodeLens) {
    const data = dataMap.get(lens)
    if (!data)
      return lens

    const { dep, versionRange, uri } = data
    const parsed = parseVersion(dep.version)
    if (!parsed) {
      lens.command = { title: '$(question) unknown', command: '' }
      return lens
    }

    const pkg = getPackageInfo(dep.name)
    if (pkg instanceof Promise) {
      lens.command = { title: '$(sync~spin) checking...', command: '' }
      void pkg.finally(() => this.scheduleRefresh())
      return lens
    }

    const latest = pkg?.distTags.latest
    if (!latest) {
      lens.command = { title: '$(question) unknown', command: '' }
      return lens
    }

    const updateType = getUpdateType(parsed.semver, latest)

    if (updateType === 'none') {
      lens.command = { title: '$(check) latest', command: '' }
    } else {
      const newVersion = formatVersion({ ...parsed, semver: latest })
      lens.command = {
        title: `$(arrow-up) ${newVersion} (${updateType})`,
        command: commands.updateVersion,
        arguments: [uri, versionRange, newVersion],
      }
    }

    return lens
  }
}
