const DEFAULT_CATALOG_NAME = 'default'

export function normalizeCatalogName(name: string): string {
  return name.trim() || DEFAULT_CATALOG_NAME
}
