import type { CodeLens, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-service'
import type { IWorkspaceState } from '../types'
import { checkIgnored, isDependencyFile } from 'npmx-language-core/utils'
import { REPLACE_TEXT_COMMAND } from 'npmx-shared/commands'
import { URI } from 'vscode-uri'
import { getConfig } from '../config'
import { formatUpgradeVersion, resolveUpgradeTiers } from '../utils/version'

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
  return {
    name: 'npmx-version-lens',
    capabilities: {
      codeLensProvider: {},
    },
    create(context): LanguageServicePluginInstance {
      return {
        async provideCodeLenses(document): Promise<CodeLens[]> {
          if (!await getConfig(context, 'npmx.versionLens.enabled'))
            return []

          const uri = URI.parse(document.uri)
          if (uri.scheme !== 'file' || !isDependencyFile(uri.path))
            return []

          const dependencies = await workspaceState.getResolvedDependencies(document.uri)
          if (!dependencies)
            return []

          const lenses: CodeLens[] = []
          const [hideWhenLatest, ignoreList] = await Promise.all([
            getConfig(context, 'npmx.versionLens.hideWhenLatest'),
            getConfig(context, 'npmx.ignore.upgrade'),
          ])

          for (const dep of dependencies) {
            if (dep.resolvedProtocol !== 'npm' || dep.category === 'peerDependencies')
              continue

            const [pkg, resolvedVersion] = await Promise.all([dep.packageInfo(), dep.resolvedVersion()])
            if (!pkg || !resolvedVersion)
              continue

            const range = {
              start: document.positionAt(dep.specRange[0]),
              end: document.positionAt(dep.specRange[1]),
            }

            const tiers = resolveUpgradeTiers(pkg, resolvedVersion)
              .map(({ type, version }) => ({ type, formatted: formatUpgradeVersion(dep, version) }))
              .filter(({ formatted }) => !checkIgnored({ ignoreList, name: dep.resolvedName, version: formatted }))

            if (tiers.length === 0 && !hideWhenLatest) {
              lenses.push({ range, command: { title: '$(check) latest', command: '' } })
              continue
            }

            for (const { type, formatted } of tiers) {
              lenses.push({
                range,
                command: {
                  title: `$(arrow-up) ${formatted} (${type})`,
                  command: REPLACE_TEXT_COMMAND,
                  arguments: [document.uri, range, formatted],
                },
              })
            }
          }

          return lenses
        },
      }
    },
  }
}
