import { DEFAULT_CATALOG_NAME } from './constants'

export function normalizeCatalogName(name: string): string {
  return name.trim() || DEFAULT_CATALOG_NAME
}
