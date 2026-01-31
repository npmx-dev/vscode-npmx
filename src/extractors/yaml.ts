import type { DependencyInfo, Extractor } from '#types/extractor'
import type { TextDocument } from 'vscode'
import type { Node, Pair, Scalar, YAMLMap } from 'yaml'
import { createCachedParse } from '#utils/data'
import { Range } from 'vscode'
import { isMap, isPair, isScalar, parseDocument } from 'yaml'

export class YamlExtractor implements Extractor<Node> {
  parse = createCachedParse((text) => parseDocument(text).contents)

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

    this.traverseCatalogs(root, (item) => {
      result.push({
        node: item.key!,
        name: String(item.key.value),
        version: String(item.value!.value),
      })
    })

    return result
  }

  private traverseCatalogs(root: YAMLMap, callback: (node: Pair<Scalar<string>, Scalar<string>>) => any) {
    const catalog = root.items.find((i) => isScalar(i.key) && i.key.value === 'catalog')
    this.traverseCatalog(catalog, callback)

    const catalogs = root.items.find((i) => isScalar(i.key) && i.key.value === 'catalogs')
    if (isMap(catalogs?.value))
      catalogs.value.items.forEach((c) => this.traverseCatalog(c, callback))
  }

  private traverseCatalog(catalog: unknown, callback: (node: Pair<Scalar<string>, Scalar<string>>) => any) {
    if (!isPair(catalog))
      return
    if (!isMap(catalog.value))
      return

    for (const item of catalog.value.items) {
      if (isScalar(item.key) && isScalar(item.value)) {
        callback(item as Pair<Scalar<string>, Scalar<string>>)
      }
    }
  }

  getDependencyInfoByOffset(root: Node, offset: number): DependencyInfo<Node> | undefined {
    // findNodeAtOffset(root, offset)
  }
}
