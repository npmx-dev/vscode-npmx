import type { Middleware } from '@volar/vscode'
import { configs } from 'npmx-shared/meta'
import { workspace } from 'vscode'

export function usesCatalogInlayHints(): boolean {
  return workspace.getConfiguration().get(configs.catalogDisplay.key, configs.catalogDisplay.default) === 'inlay-hint'
}

export const provideCatalogInlayHints: NonNullable<Middleware['provideInlayHints']> = async (document, range, token, next) => {
  if (!usesCatalogInlayHints())
    return []

  const hints = await next(document, range, token)
  return usesCatalogInlayHints() ? hints : []
}
