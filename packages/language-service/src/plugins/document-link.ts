import type { DocumentLink, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-service'
import type { IWorkspaceState } from '../types'
import { npmxPackageUrl } from 'npmx-language-core/links'
import { isDependencyFile } from 'npmx-language-core/utils'
import { URI } from 'vscode-uri'
import { getConfig } from '../config'

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
  return {
    name: 'npmx-document-link',
    capabilities: {
      documentLinkProvider: {},
    },
    create(context): LanguageServicePluginInstance {
      return {
        async provideDocumentLinks(document): Promise<DocumentLink[] | undefined> {
          const linkMode = await getConfig(context, 'npmx.packageLinks')
          if (linkMode === 'off')
            return

          const uri = URI.parse(document.uri)
          if (uri.scheme !== 'file' || !isDependencyFile(uri.path))
            return

          const dependencies = await workspaceState.getResolvedDependencies(document.uri)
          if (!dependencies)
            return

          const links: DocumentLink[] = []

          for (const dep of dependencies) {
            if (dep.resolvedProtocol !== 'npm')
              continue

            const { resolvedName, resolvedSpec, nameRange } = dep

            let targetVersion: string | undefined

            if (linkMode === 'declared') {
              targetVersion = resolvedSpec
            } else if (linkMode === 'resolved') {
              targetVersion = await dep.resolvedVersion() ?? resolvedSpec
            }

            const url = targetVersion
              ? npmxPackageUrl(resolvedName, targetVersion)
              : npmxPackageUrl(resolvedName)

            const [start, end] = nameRange
            links.push({
              range: {
                start: document.positionAt(start),
                end: document.positionAt(end),
              },
              target: url,
              tooltip: `Open ${resolvedName}@${targetVersion ?? 'latest'} on npmx`,
            })
          }

          return links
        },
      }
    },
  }
}
