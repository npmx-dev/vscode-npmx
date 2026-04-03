import type { CodeLens, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-service'
import type { OffsetRange } from 'npmx-language-core/types'
import type { IWorkspaceState } from '../types'
import { isDependencyFile } from 'npmx-language-core/utils'
import { REPLACE_TEXT_COMMAND } from 'npmx-shared/commands'
import diff from 'semver/functions/diff'
import { URI } from 'vscode-uri'
import { getConfig } from '../config'
import { resolveUpgrade } from './diagnostics/rules/upgrade'

interface LenData {
  uri: string
  specRange: OffsetRange
}

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
  const UNKNOWN_COMMAND: CodeLens['command'] = { title: '$(question) unknown', command: '' }

  return {
    name: 'npmx-version-lens',
    capabilities: {
      codeLensProvider: {
        resolveProvider: true,
      },
    },
    create(context): LanguageServicePluginInstance {
      async function resolveVersionLensCommand({ uri, specRange }: LenData, range: CodeLens['range']): Promise<CodeLens['command']> {
        const dependencies = await workspaceState.getResolvedDependencies(uri)
        const dep = dependencies?.find(
          (d) => d.specRange[0] === specRange[0] && d.specRange[1] === specRange[1],
        )
        if (!dep)
          return UNKNOWN_COMMAND

        const pkg = await dep.packageInfo()
        if (!pkg)
          return UNKNOWN_COMMAND

        const resolvedVersion = await dep.resolvedVersion()
        if (!resolvedVersion)
          return UNKNOWN_COMMAND

        const ignoreList = await getConfig(context, 'npmx.ignore.upgrade')
        const targetVersion = resolveUpgrade(dep, pkg, resolvedVersion, ignoreList)
        if (!targetVersion)
          return { title: '$(check) latest', command: '' }

        const updateType = diff(resolvedVersion, pkg.distTags.latest)
        return {
          title: updateType
            ? `$(arrow-up) ${targetVersion} (${updateType})`
            : `$(arrow-up) ${targetVersion}`,
          command: REPLACE_TEXT_COMMAND,
          arguments: [uri, range, targetVersion],
        }
      }

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

          return dependencies
            .filter((dep) => dep.resolvedProtocol === 'npm')
            .map((dep) => ({
              range: {
                start: document.positionAt(dep.specRange[0]),
                end: document.positionAt(dep.specRange[1]),
              },
              data: { uri: document.uri, specRange: dep.specRange } satisfies LenData,
            } satisfies CodeLens))
        },

        async resolveCodeLens(lens): Promise<CodeLens> {
          const command = await resolveVersionLensCommand(lens.data as LenData, lens.range)
          return { ...lens, command }
        },
      }
    },
  }
}
