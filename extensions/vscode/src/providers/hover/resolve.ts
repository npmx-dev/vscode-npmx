import type { DependencyInfo } from '#core/workspace'
import type { Position, TextDocument } from 'vscode'
import { getResolvedDependencies, getResolvedDependencyByOffset } from '#core/workspace'
import { PACKAGE_JSON_BASENAME } from 'npmx-language-core/constants'
import { getImportSpecifierInLine, isDependencyFile } from 'npmx-language-core/utils'
import { findUp } from 'vscode-find-up'

export async function resolveHoverDependency(
  document: TextDocument,
  position: Position,
): Promise<DependencyInfo | undefined> {
  if (document.uri.scheme !== 'file')
    return

  const offset = document.offsetAt(position)

  if (isDependencyFile(document.uri.path))
    return await getResolvedDependencyByOffset(document.uri, offset)

  const wordRange = document.getWordRangeAtPosition(position)
  if (!wordRange)
    return

  const line = document.lineAt(position.line)
  const hit = getImportSpecifierInLine(line.text, [
    wordRange.start.character,
    wordRange.end.character,
  ])
  if (!hit)
    return

  const pkgJsonUri = await findUp(PACKAGE_JSON_BASENAME, {
    cwd: document.uri,
  })
  if (!pkgJsonUri)
    return

  const dependencies = await getResolvedDependencies(pkgJsonUri)
  return dependencies?.find((dependency) => dependency.rawName === hit.packageName)
}
