import type { WorkspaceCatalogs } from '#utils/catalog'
import type { Node, Pair, Scalar, YAMLMap } from 'yaml'
import { isMap, isPair, isScalar } from 'yaml'

export type YamlCatalogEntry = Pair<Scalar<string>, Scalar<string>>

export function traverseYamlCatalogs(root: YAMLMap, callback: (entry: YamlCatalogEntry, catalogName: string) => boolean | void): boolean {
  const catalog = root.items.find((i) => isScalar(i.key) && i.key.value === 'catalog')
  if (visitCatalogEntries(catalog, (entry) => callback(entry, '')))
    return true

  const catalogs = root.items.find((i) => isScalar(i.key) && i.key.value === 'catalogs')
  if (isMap(catalogs?.value)) {
    for (const c of catalogs.value.items) {
      if (!isScalar(c.key))
        continue
      const name = String(c.key.value)
      if (visitCatalogEntries(c, (entry) => callback(entry, name)))
        return true
    }
  }

  return false
}

function visitCatalogEntries(catalog: unknown, callback: (entry: YamlCatalogEntry) => boolean | void): boolean {
  if (!isPair(catalog) || !isMap(catalog.value))
    return false

  for (const item of catalog.value.items) {
    if (isScalar(item.key) && isScalar(item.value)) {
      if (callback(item as YamlCatalogEntry))
        return true
    }
  }

  return false
}

export function extractYamlCatalogs(root: Node): WorkspaceCatalogs {
  const result: WorkspaceCatalogs = new Map()

  if (!isMap(root))
    return result

  traverseYamlCatalogs(root, (entry, catalogName) => {
    if (!entry.value?.range)
      return

    const name = String(entry.key.value)
    const version = String(entry.value.value)

    catalogName ||= 'default'
    let catalog = result.get(catalogName)
    if (!catalog) {
      catalog = new Map()
      result.set(catalogName, catalog)
    }

    catalog.set(name, version)
  })

  return result
}
