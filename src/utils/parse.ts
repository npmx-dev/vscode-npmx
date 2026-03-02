import type { ValidNode } from '#types/extractor'
import type { Node as JsonNode } from 'jsonc-parser'
import type { TextDocument } from 'vscode'
import type { Node as YamlNode } from 'yaml'
import { parseTree } from 'jsonc-parser'
import { workspace } from 'vscode'
import { parseDocument } from 'yaml'

function createDocumentParse<T extends ValidNode>(parse: (text: string) => T | null) {
  const cache = new Map<string, T | null>()

  return (doc: TextDocument): T | null => {
    const key = doc.uri.toString()
    if (cache.has(key))
      return cache.get(key)!
    const result = parse(doc.getText())
    cache.set(key, result)
    const disposable = workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === key) {
        cache.delete(key)
        disposable.dispose()
      }
    })
    return result
  }
}

export const parseJson = createDocumentParse<JsonNode>((text) => parseTree(text) ?? null)

export const parseYaml = createDocumentParse<YamlNode>((text) => parseDocument(text).contents)
