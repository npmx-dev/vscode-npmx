import type { LanguageServiceContext } from '@volar/language-service'
import type { OffsetRange } from 'npmx-language-core/types'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import type { URI } from 'vscode-uri'
import { TextDocument } from 'vscode-languageserver-textdocument'

export async function getDocumentByUri(context: LanguageServiceContext, uri: URI) {
  const sourceScript = context.language.scripts.get(uri, true)
  if (sourceScript)
    return context.documents.get(sourceScript.id, sourceScript.languageId, sourceScript.snapshot)

  const text = await context.env.fs!.readFile(uri)
  if (text == null)
    return

  return TextDocument.create(uri.toString(), 'json', 0, text)
}

function isOffsetInRange(offset: number, [start, end]: OffsetRange): boolean {
  return offset >= start && offset <= end
}

export function getResolvedDependencyAtOffset(
  dependencies: DependencyInfo[],
  offset: number,
): DependencyInfo | undefined {
  return dependencies.find((dep) =>
    isOffsetInRange(offset, dep.nameRange) || isOffsetInRange(offset, dep.specRange),
  )
}
