import type { CompletionItemKind, CompletionList, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-service'
import type { IWorkspaceState } from '../types'
import { isDependencyFile } from 'npmx-language-core/utils'
import { URI } from 'vscode-uri'
import { getConfig } from '../config'
import { getResolvedDependencyAtOffset } from '../utils/range'
import { formatUpgradeVersion } from '../utils/version'

const PRERELEASE_PATTERN = /-.+/

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
  return {
    name: 'npmx-version-completion',
    capabilities: {
      completionProvider: {
        triggerCharacters: [':', '^', '~', '.'],
      },
    },
    create(context): LanguageServicePluginInstance {
      return {
        async provideCompletionItems(document, position): Promise<CompletionList | undefined> {
          const completionVersion = await getConfig(context, 'npmx.completion.version')
          if (completionVersion === 'off')
            return

          const uri = URI.parse(document.uri)
          if (uri.scheme !== 'file' || !isDependencyFile(uri.path))
            return

          const dependencies = await workspaceState.getResolvedDependencies(document.uri)
          if (!dependencies)
            return

          const offset = document.offsetAt(position)
          const dep = getResolvedDependencyAtOffset(dependencies, offset)
          if (!dep || dep.resolvedProtocol !== 'npm')
            return

          const pkg = await dep.packageInfo()
          if (!pkg)
            return

          const excludePrerelease = await getConfig(context, 'npmx.completion.excludePrerelease')
          const items: CompletionList['items'] = []

          for (const version in pkg.versionsMeta) {
            const meta = pkg.versionsMeta[version]!

            if (meta.deprecated != null)
              continue

            if (excludePrerelease && PRERELEASE_PATTERN.test(version))
              continue

            if (completionVersion === 'provenance-only' && !meta.provenance)
              continue

            const text = formatUpgradeVersion(dep, version)

            const tag = pkg.versionToTag.get(version)

            items.push({
              label: text,
              kind: 12 satisfies typeof CompletionItemKind.Value,
              insertText: text,
              detail: tag,
            })
          }

          return { isIncomplete: false, items }
        },
      }
    },
  }
}
