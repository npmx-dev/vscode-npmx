import type { Packument } from '@npm/types'
import { fetchNpm } from './fetch'

/**
 * Encode a package name for use in npm registry URLs.
 * Handles scoped packages (e.g., @scope/name -> @scope%2Fname).
 */
function encodePackageName(name: string): string {
  if (name.startsWith('@')) {
    return `@${encodeURIComponent(name.slice(1))}`
  }
  return encodeURIComponent(name)
}

const cache = new Map<string, Packument>()

async function fetchPackage(name: string) {
  const encodedName = encodePackageName(name)
  return await fetchNpm<Packument>(`/${encodedName}`)
}

export async function getPackage(name: string) {
  if (!cache.has(name))
    cache.set(name, await fetchPackage(name))

  return cache.get(name)!
}
