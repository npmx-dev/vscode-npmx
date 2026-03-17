export function normalizeCatalogName(name: string): string {
  return name.trim() || 'default'
}
