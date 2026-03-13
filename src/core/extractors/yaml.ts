import type { BaseExtractor, DependencyInfo, OffsetRange, WorkspaceCatalogExtractor, WorkspaceCatalogInfo, YamlNode } from '#types/extractor'
import type { Pair, Scalar, YAMLMap } from 'yaml'
import { normalizeCatalogName } from '#utils/dependency'
import { isMap, isPair, isScalar, parseDocument } from 'yaml'

const CATALOG_SECTION = 'catalog'
const CATALOGS_SECTION = 'catalogs'

type CatalogEntry = Pair<Scalar<string>, Scalar<string>>

type CatalogEntryVisitor = (
  catalog: CatalogEntry,
  meta: {
    category: 'catalog' | 'catalogs'
    categoryName?: string
  },
) => boolean | void

export class YamlExtractor implements WorkspaceCatalogExtractor, BaseExtractor<YamlNode> {
  parse = (text: string) => parseDocument(text).contents

  #getScalarRange(node: YamlNode): OffsetRange {
    const [start, end] = node.range!
    return [start, end]
  }

  #traverseCatalog(
    catalog: unknown,
    meta: {
      category: 'catalog' | 'catalogs'
      categoryName?: string
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

  #traverseCatalogs(root: YAMLMap, callback: CatalogEntryVisitor): boolean {
    const catalog = root.items.find((i) => isScalar(i.key) && i.key.value === CATALOG_SECTION)
    if (this.#traverseCatalog(catalog, { category: 'catalog', categoryName: '' }, callback))
      return true

    const catalogs = root.items.find((i) => isScalar(i.key) && i.key.value === CATALOGS_SECTION)
    if (isMap(catalogs?.value)) {
      for (const c of catalogs.value.items) {
        const categoryName = isScalar(c.key) ? String(c.key.value) : undefined
        if (this.#traverseCatalog(c, { category: 'catalogs', categoryName }, callback))
          return true
      }
    }

    return false
  }

  getDependenciesInfo(root: YamlNode): DependencyInfo[] {
    if (!isMap(root))
      return []

    const result: DependencyInfo[] = []

    this.#traverseCatalogs(root, (item, meta) => {
      result.push({
        category: meta.category,
        rawName: String(item.key.value),
        rawSpec: String(item.value!.value),
        nameRange: this.#getScalarRange(item.key),
        specRange: this.#getScalarRange(item.value!),
        categoryName: meta.categoryName,
      })
    })

    return result
  }

  getWorkspaceCatalogInfo(text: string): WorkspaceCatalogInfo | undefined {
    const root = this.parse(text)
    if (!root)
      return

    const dependencies = this.getDependenciesInfo(root)
    const catalogs: Record<string, Record<string, string>> = {}

    for (const dependency of dependencies) {
      const categoryName = normalizeCatalogName(dependency.categoryName!)
      catalogs[categoryName] ??= {}
      catalogs[categoryName][dependency.rawName] = dependency.rawSpec
    }

    return {
      dependencies,
      catalogs: Object.keys(catalogs).length > 0 ? catalogs : undefined,
    }
  }
}
