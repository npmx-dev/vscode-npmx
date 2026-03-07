import type { Extractor } from '#types/extractor'
import type { Uri } from 'vscode'
import { workspace } from 'vscode'

export async function readExtractorRoot<T>(
  uri: Uri,
  extractor: Extractor<T>,
): Promise<T | undefined> {
  const document = await workspace.openTextDocument(uri)
  const text = document.getText()

  return extractor.parse(text) ?? undefined
}
