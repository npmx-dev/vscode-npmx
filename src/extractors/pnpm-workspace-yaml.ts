import type { DependencyInfo, Extractor } from '#types/extractor'
import type { TextDocument } from 'vscode'
import type { Node, Pair, Scalar, YAMLMap } from 'yaml'
import { isInRange } from '#utils/ast'
import { createCachedParse } from '#utils/parse'
import { Range } from 'vscode'
import { isMap, isPair, isScalar, parseDocument } from 'yaml'

const CATALOG_SECTION = 'catalog'
const CATALOGS_SECTION = 'catalogs'

type CatalogEntry = Pair<Scalar<string>, Scalar<string>>

type CatalogEntryVisitor = (catalog: CatalogEntry) => boolean | void

export class PnpmWorkspaceYamlExtractor implements Extractor<Node> {
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
        nameNode: item.key,
        versionNode: item.value!,
        name: String(item.key.value),
        version: String(item.value!.value),
      })
    })

    return result
  }

  private traverseCatalogs(root: YAMLMap, callback: CatalogEntryVisitor): boolean {
    const catalog = root.items.find((i) => isScalar(i.key) && i.key.value === CATALOG_SECTION)
    if (this.traverseCatalog(catalog, callback))
      return true

    const catalogs = root.items.find((i) => isScalar(i.key) && i.key.value === CATALOGS_SECTION)
    if (isMap(catalogs?.value)) {
      for (const c of catalogs.value.items) {
        if (this.traverseCatalog(c, callback))
          return true
      }
    }

    return false
  }

  private traverseCatalog(catalog: unknown, callback: CatalogEntryVisitor): boolean {
    if (!isPair(catalog))
      return false
    if (!isMap(catalog.value))
      return false

    for (const item of catalog.value.items) {
      if (isScalar(item.key) && isScalar(item.value)) {
        if (callback(item as CatalogEntry))
          return true
      }
    }

    return false
  }

  getDependencyInfoByOffset(root: Node, offset: number): DependencyInfo<Node> | undefined {
    if (!isMap(root))
      return

    let result: DependencyInfo<Node> | undefined

    this.traverseCatalogs(root, (item) => {
      if (
        isInRange(offset, item.value!.range!)
        || isInRange(offset, item.key.range!)
      ) {
        result = {
          nameNode: item.key,
          versionNode: item.value!,
          name: String(item.key.value),
          version: String(item.value!.value),
        }
        return true
      }
    })

    return result
  }
}
