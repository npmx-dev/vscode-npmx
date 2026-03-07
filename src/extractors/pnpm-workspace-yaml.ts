import type { DependencyInfo, Extractor } from '#types/extractor'
import type { TextDocument } from 'vscode'
import type { Node, Pair, Scalar, YAMLMap } from 'yaml'
import { isInRange } from '#utils/ast'
import { Range } from 'vscode'
import { isMap, isPair, isScalar, parseDocument } from 'yaml'

const CATALOG_SECTION = 'catalog'
const CATALOGS_SECTION = 'catalogs'

type CatalogEntry = Pair<Scalar<string>, Scalar<string>>

type CatalogEntryVisitor = (
  catalog: CatalogEntry,
  meta: {
    category: 'catalog' | 'catalogs'
    catalogName?: string
  },
) => boolean | void

export class PnpmWorkspaceYamlExtractor implements Extractor<Node> {
  parse = (text: string) => parseDocument(text).contents

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

    this.traverseCatalogs(root, (item, meta) => {
      result.push({
        category: meta.category,
        rawName: String(item.key.value),
        rawSpec: String(item.value!.value),
        nameNode: item.key,
        specNode: item.value!,
        catalogName: meta.catalogName,
      })
    })

    return result
  }

  private traverseCatalogs(root: YAMLMap, callback: CatalogEntryVisitor): boolean {
    const catalog = root.items.find((i) => isScalar(i.key) && i.key.value === CATALOG_SECTION)
    if (this.traverseCatalog(catalog, { category: 'catalog' }, callback))
      return true

    const catalogs = root.items.find((i) => isScalar(i.key) && i.key.value === CATALOGS_SECTION)
    if (isMap(catalogs?.value)) {
      for (const c of catalogs.value.items) {
        const catalogName = isScalar(c.key) ? String(c.key.value) : undefined
        if (this.traverseCatalog(c, { category: 'catalogs', catalogName }, callback))
          return true
      }
    }

    return false
  }

  private traverseCatalog(
    catalog: unknown,
    meta: {
      category: 'catalog' | 'catalogs'
      catalogName?: string
    },
    callback: CatalogEntryVisitor,
  ): boolean {
    if (!isPair(catalog))
      return false
    if (!isMap(catalog.value))
      return false

    for (const item of catalog.value.items) {
      if (isScalar(item.key) && isScalar(item.value)) {
        if (callback(item as CatalogEntry, meta))
          return true
      }
    }

    return false
  }

  getDependencyInfoByOffset(root: Node, offset: number): DependencyInfo<Node> | undefined {
    if (!isMap(root))
      return

    let result: DependencyInfo<Node> | undefined

    this.traverseCatalogs(root, (item, meta) => {
      if (
        isInRange(offset, item.value!.range!)
        || isInRange(offset, item.key.range!)
      ) {
        result = {
          category: meta.category,
          rawName: String(item.key.value),
          rawSpec: String(item.value!.value),
          nameNode: item.key,
          specNode: item.value!,
          catalogName: meta.catalogName,
        }
        return true
      }
    })

    return result
  }
}
