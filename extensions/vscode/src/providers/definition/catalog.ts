import type { DefinitionProvider, Position, TextDocument } from 'vscode'
import { getResolvedDependencyByOffset, getWorkspaceContext } from '#core/workspace'
import { offsetRangeToRange } from '#utils/ast'
import { normalizeCatalogName } from 'npmx-language-core/utils'
import { Location, workspace } from 'vscode'

export class CatalogDefinitionProvider implements DefinitionProvider {
  async provideDefinition(document: TextDocument, position: Position) {
    const offset = document.offsetAt(position)
    const info = await getResolvedDependencyByOffset(document.uri, offset)
    if (!info?.rawSpec.startsWith('catalog:'))
      return

    const ctx = await getWorkspaceContext(document.uri)
    if (!ctx?.workspaceFilePath)
      return

    const dependencies = (await ctx.loadWorkspaceFileInfo(ctx.workspaceFilePath))?.dependencies
    if (!dependencies)
      return

    const target = dependencies.find(
      (dep) =>
        dep.rawName === info.resolvedName
        && dep.categoryName != null && info.categoryName != null
        && normalizeCatalogName(dep.categoryName) === normalizeCatalogName(info.categoryName),
    )
    if (!target)
      return

    const workspaceFileUri = document.uri.with({ path: ctx.workspaceFilePath })
    const workspaceDocument = await workspace.openTextDocument(workspaceFileUri)

    return new Location(
      workspaceFileUri,
      offsetRangeToRange(workspaceDocument, target.specRange),
    )
  }
}
