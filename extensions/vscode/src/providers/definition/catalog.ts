import type { DefinitionProvider, Position, TextDocument } from 'vscode'
import { getResolvedDependencyByOffset, getWorkspaceContext } from '#core/workspace'
import { offsetRangeToRange } from '#utils/ast'
import { normalizeCatalogName } from '#utils/dependency'
import { Location, workspace } from 'vscode'

export class CatalogDefinitionProvider implements DefinitionProvider {
  async provideDefinition(document: TextDocument, position: Position) {
    const offset = document.offsetAt(position)
    const info = await getResolvedDependencyByOffset(document.uri, offset)
    if (!info?.rawSpec.startsWith('catalog:'))
      return

    const ctx = await getWorkspaceContext(document.uri)
    if (!ctx?.workspaceFileUri)
      return

    const catalogInfo = await ctx.loadWorkspaceCatalogInfo(ctx.workspaceFileUri)
    if (!catalogInfo)
      return

    const target = catalogInfo.dependencies.find(
      (dep) =>
        dep.rawName === info.resolvedName
        && dep.categoryName != null && info.categoryName != null
        && normalizeCatalogName(dep.categoryName) === normalizeCatalogName(info.categoryName),
    )
    if (!target)
      return

    const workspaceDocument = await workspace.openTextDocument(ctx.workspaceFileUri)

    return new Location(
      ctx.workspaceFileUri,
      offsetRangeToRange(workspaceDocument, target.specRange),
    )
  }
}
