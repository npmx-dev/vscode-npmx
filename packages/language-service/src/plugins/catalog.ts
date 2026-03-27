import type { CompletionItemKind, CompletionList, LanguageServicePlugin, LanguageServicePluginInstance, LocationLink } from '@volar/language-service'
import type { IWorkspaceState } from '../types'
import { isDependencyFile, normalizeCatalogName } from 'npmx-language-core/utils'
import { URI } from 'vscode-uri'
import { getResolvedDependencyAtOffset } from '../utils/range'

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
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
          const uri = URI.parse(document.uri)
          if (uri.scheme !== 'file' || !isDependencyFile(uri.path))
            return

          const offset = document.offsetAt(position)
          const dependencies = await workspaceState.getResolvedDependencies(document.uri)
          if (!dependencies)
            return

          const dep = getResolvedDependencyAtOffset(dependencies, offset)
          if (!dep?.rawSpec.startsWith('catalog:'))
            return

          const ctx = await workspaceState.getWorkspaceContext(document.uri)
          if (!ctx)
            return

          const catalogs = await ctx.getCatalogs()
          if (!catalogs)
            return

          const items: CompletionList['items'] = []

          for (const [name, catalog] of Object.entries(catalogs)) {
            const version = catalog[dep.resolvedName]
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
          const uri = URI.parse(document.uri)
          if (uri.scheme !== 'file' || !isDependencyFile(uri.path))
            return

          const offset = document.offsetAt(position)
          const dependencies = await workspaceState.getResolvedDependencies(document.uri)
          if (!dependencies)
            return

          const dep = getResolvedDependencyAtOffset(dependencies, offset)
          if (!dep?.rawSpec.startsWith('catalog:'))
            return

          const ctx = await workspaceState.getWorkspaceContext(document.uri)
          if (!ctx?.workspaceFilePath)
            return

          const workspaceFileInfo = await ctx.loadWorkspaceFileInfo(ctx.workspaceFilePath)
          if (!workspaceFileInfo)
            return

          const target = workspaceFileInfo.dependencies.find(
            (d) =>
              d.rawName === dep.resolvedName
              && d.categoryName != null && dep.categoryName != null
              && normalizeCatalogName(d.categoryName) === normalizeCatalogName(dep.categoryName),
          )
          if (!target)
            return

          const workspaceFileUri = uri.with({ path: ctx.workspaceFilePath })
          const sourceScript = context.language.scripts.get(workspaceFileUri)
          if (!sourceScript)
            return

          const workspaceDocument = context.documents.get(sourceScript.id, sourceScript.languageId, sourceScript.snapshot)

          const [targetStart, targetEnd] = target.specRange
          const originStart = document.positionAt(dep.specRange[0])
          const originEnd = document.positionAt(dep.specRange[1])

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
