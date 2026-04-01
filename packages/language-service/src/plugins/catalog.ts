import type { CompletionItemKind, CompletionList, LanguageServicePlugin, LanguageServicePluginInstance, LocationLink } from '@volar/language-service'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import type { IWorkspaceState } from '../types'
import { isPackageManifest, normalizeCatalogName } from 'npmx-language-core/utils'
import { URI } from 'vscode-uri'
import { getDocumentByUri, getResolvedDependencyAtOffset } from '../utils/document'

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
  function getDependencyFileUri(documentUri: string): URI | undefined {
    const uri = URI.parse(documentUri)
    if (uri.scheme !== 'file' || !isPackageManifest(uri.path))
      return

    return uri
  }

  async function getCatalogDependency(documentUri: string, offset: number): Promise<DependencyInfo | undefined> {
    const dependencies = await workspaceState.getResolvedDependencies(documentUri)
    if (!dependencies)
      return

    const dependency = getResolvedDependencyAtOffset(dependencies, offset)
    if (!dependency?.rawSpec.startsWith('catalog:'))
      return

    return dependency
  }

  function matchesCatalogDependency(candidate: DependencyInfo, dependency: DependencyInfo): boolean {
    return candidate.rawName === dependency.resolvedName
      && candidate.categoryName != null
      && dependency.categoryName != null
      && normalizeCatalogName(candidate.categoryName) === normalizeCatalogName(dependency.categoryName)
  }

  return {
    name: 'npmx-catalog',
    capabilities: {
      completionProvider: {
        triggerCharacters: [':'],
      },
      definitionProvider: true,
    },
    create(context): LanguageServicePluginInstance {
      return {
        async provideCompletionItems(document, position): Promise<CompletionList | undefined> {
          const dependencyFileUri = getDependencyFileUri(document.uri)
          if (!dependencyFileUri)
            return

          const offset = document.offsetAt(position)
          const dependency = await getCatalogDependency(document.uri, offset)
          if (!dependency)
            return

          const workspaceContext = await workspaceState.getWorkspaceContext(document.uri)
          if (!workspaceContext)
            return

          const catalogs = await workspaceContext.getCatalogs()
          if (!catalogs)
            return

          const items: CompletionList['items'] = []

          for (const [name, catalog] of Object.entries(catalogs)) {
            const version = catalog[dependency.resolvedName]
            if (!version)
              continue

            items.push({
              label: name,
              kind: 12 satisfies typeof CompletionItemKind.Value,
              detail: version,
            })
          }

          return { isIncomplete: false, items }
        },

        async provideDefinition(document, position): Promise<LocationLink[] | undefined> {
          const dependencyFileUri = getDependencyFileUri(document.uri)
          if (!dependencyFileUri)
            return

          const offset = document.offsetAt(position)
          const dependency = await getCatalogDependency(document.uri, offset)
          if (!dependency)
            return

          const workspaceContext = await workspaceState.getWorkspaceContext(document.uri)
          if (!workspaceContext?.workspaceFilePath)
            return

          const workspaceFileInfo = await workspaceContext.loadWorkspaceFileInfo(workspaceContext.workspaceFilePath)
          if (!workspaceFileInfo)
            return

          const targetDependency = workspaceFileInfo.dependencies.find((candidate) =>
            matchesCatalogDependency(candidate, dependency),
          )
          if (!targetDependency)
            return

          const workspaceFileUri = dependencyFileUri.with({ path: workspaceContext.workspaceFilePath })
          const workspaceDocument = await getDocumentByUri(context, workspaceFileUri)
          if (!workspaceDocument)
            return

          const [targetStart, targetEnd] = targetDependency.specRange
          const originStart = document.positionAt(dependency.specRange[0])
          const originEnd = document.positionAt(dependency.specRange[1])

          return [{
            targetUri: workspaceFileUri.toString(),
            targetRange: {
              start: workspaceDocument.positionAt(targetStart),
              end: workspaceDocument.positionAt(targetEnd),
            },
            targetSelectionRange: {
              start: workspaceDocument.positionAt(targetStart),
              end: workspaceDocument.positionAt(targetEnd),
            },
            originSelectionRange: {
              start: originStart,
              end: originEnd,
            },
          }]
        },
      }
    },
  }
}
