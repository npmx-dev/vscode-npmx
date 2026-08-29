import type { CompletionItemKind, CompletionList, LanguageServicePlugin, LanguageServicePluginInstance, LocationLink } from '@volar/language-service'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import type { IWorkspaceState } from '../types'
import { isPackageManifest } from 'npmx-language-core/utils'
import { URI } from 'vscode-uri'
import { getDocumentByUri, getResolvedDependencySpecAtOffset } from '../utils/document'

export function getCatalogDependencyAtOffset(
  dependencies: DependencyInfo[],
  offset: number,
): DependencyInfo | undefined {
  const dependency = getResolvedDependencySpecAtOffset(dependencies, offset)
  if (!dependency?.rawSpec.startsWith('catalog:'))
    return

  return dependency
}

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

    return getCatalogDependencyAtOffset(dependencies, offset)
  }

  return {
    name: 'npmx-catalog',
    capabilities: {
      completionProvider: {
        triggerCharacters: [':'],
      },
      definitionProvider: true,
      inlayHintProvider: {},
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

          const catalogs = await workspaceState.getCatalogs(document.uri)
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

          const target = await workspaceState.findCatalogDependency(document.uri, dependency)
          if (!target)
            return

          const workspaceFileUri = dependencyFileUri.with({ path: target.path })
          const workspaceDocument = await getDocumentByUri(context, workspaceFileUri)
          if (!workspaceDocument)
            return

          const [targetStart, targetEnd] = target.dependency.specRange
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

        async provideInlayHints(document, range) {
          if (!workspaceState.getClientFeatures().catalogInlayHints)
            return

          const dependencyFileUri = getDependencyFileUri(document.uri)
          if (!dependencyFileUri)
            return

          const dependencies = await workspaceState.getResolvedDependencies(document.uri)
          if (!dependencies)
            return

          const startOffset = document.offsetAt(range.start)
          const endOffset = document.offsetAt(range.end)

          return dependencies.flatMap((dependency) => {
            if (dependency.protocol !== 'catalog')
              return []

            const [specStart, specEnd] = dependency.specRange
            if (specEnd < startOffset || specStart > endOffset)
              return []

            return [{
              position: document.positionAt(specEnd),
              label: dependency.resolvedSpec,
              paddingLeft: true,
            }]
          })
        },
      }
    },
  }
}
