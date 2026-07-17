import type { DocumentLink, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-service'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import type { ConfigKeyTypeMap } from 'npmx-shared/meta'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { IWorkspaceState } from '../types'
import { npmxPackageUrl } from 'npmx-language-core/links'
import { isDependencyFile } from 'npmx-language-core/utils'
import { URI } from 'vscode-uri'
import { getConfig } from '../config'

type PackageLinkMode = ConfigKeyTypeMap['npmx.packageLinks']
type EnabledPackageLinkMode = Exclude<PackageLinkMode, 'off'>

export async function providePackageDocumentLinks(
  document: TextDocument,
  dependencies: DependencyInfo[],
  linkMode: EnabledPackageLinkMode,
): Promise<DocumentLink[]> {
  const links: DocumentLink[] = []

  for (const dep of dependencies) {
    if (dep.resolvedProtocol !== 'npm' || dep.protocol === 'catalog')
      continue

    const { resolvedName, resolvedSpec, specRange } = dep

    let targetVersion: string | undefined

    if (linkMode === 'declared') {
      targetVersion = resolvedSpec
    } else if (linkMode === 'resolved') {
      targetVersion = await dep.resolvedVersion() ?? resolvedSpec
    }

    const url = targetVersion
      ? npmxPackageUrl(resolvedName, targetVersion)
      : npmxPackageUrl(resolvedName)

    const [start, end] = specRange
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
}

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
  return {
    name: 'npmx-document-link',
    capabilities: {
      documentLinkProvider: {},
    },
    create(context): LanguageServicePluginInstance {
      return {
        async provideDocumentLinks(document): Promise<DocumentLink[] | undefined> {
          const uri = URI.parse(document.uri)
          if (uri.scheme !== 'file' || !isDependencyFile(uri.path))
            return

          const linkMode = await getConfig(context, 'npmx.packageLinks')
          if (linkMode === 'off')
            return

          const dependencies = await workspaceState.getResolvedDependencies(document.uri)
          if (!dependencies)
            return

          return providePackageDocumentLinks(document, dependencies, linkMode)
        },
      }
    },
  }
}
