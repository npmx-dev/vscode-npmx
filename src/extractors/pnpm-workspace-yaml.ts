import type { DependencyInfo, Extractor } from '#types/extractor'
import type { TextDocument } from 'vscode'
import type { Node } from 'yaml'
import { isInRange } from '#utils/ast'
import { traverseYamlCatalogs } from '#utils/catalog/yaml'
import { parseYaml } from '#utils/parse'
import { Range } from 'vscode'
import { isMap } from 'yaml'

export class PnpmWorkspaceYamlExtractor implements Extractor<Node> {
  parse = parseYaml

  getNodeRange(doc: TextDocument, node: Node) {
    const [start, end] = node.range!

    return new Range(
      doc.positionAt(start),
      doc.positionAt(end),
    )
  }

  getDependenciesInfo(root: Node): DependencyInfo<Node>[] {
    if (!isMap(root))
      return []

    const result: DependencyInfo<Node>[] = []

    traverseYamlCatalogs(root, (entry) => {
      result.push({
        nameNode: entry.key,
        versionNode: entry.value!,
        name: String(entry.key.value),
        version: String(entry.value!.value),
      })
    })

    return result
  }

  getDependencyInfoByOffset(root: Node, offset: number): DependencyInfo<Node> | undefined {
    if (!isMap(root))
      return

    let result: DependencyInfo<Node> | undefined

    traverseYamlCatalogs(root, (entry) => {
      if (
        isInRange(offset, entry.value!.range!)
        || isInRange(offset, entry.key.range!)
      ) {
        result = {
          nameNode: entry.key,
          versionNode: entry.value!,
          name: String(entry.key.value),
          version: String(entry.value!.value),
        }
        return true
      }
    })

    return result
  }
}
