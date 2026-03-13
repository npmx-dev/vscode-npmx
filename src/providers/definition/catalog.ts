import type { CancellationToken, DefinitionProvider, Position, TextDocument } from 'vscode'
import { getResolvedDependencyByOffset, getWorkspaceContext } from '#core/workspace'
import { offsetRangeToRange } from '#utils/ast'
import { Location, workspace } from 'vscode'

export class CatalogDefinitionProvider implements DefinitionProvider {
  async provideDefinition(document: TextDocument, position: Position, _token: CancellationToken) {
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

    const target = catalogInfo
      .dependencies
      .find((dep) => dep.categoryName === info.categoryName && dep.rawName === info.resolvedName)
    if (!target)
      return

    const workspaceDocument = await workspace.openTextDocument(ctx.workspaceFileUri)

    return new Location(
      ctx.workspaceFileUri,
      offsetRangeToRange(workspaceDocument, target.specRange),
    )
  }
}
