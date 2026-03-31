import type { LanguageServicePlugin } from '@volar/language-service'
import type { IWorkspaceState } from './types'
import { create as createNpmxCatalogService } from './plugins/catalog'
import { create as createNpmxDiagnosticsService } from './plugins/diagnostics'
import { create as createNpmxHoverService } from './plugins/hover'
import { create as createNpmxVersionCompletionService } from './plugins/version-completion'

export function createNpmxLanguageServicePlugins(workspace: IWorkspaceState): LanguageServicePlugin[] {
  return [
    createNpmxCatalogService(workspace),
    createNpmxDiagnosticsService(workspace),
    createNpmxHoverService(workspace),
    createNpmxVersionCompletionService(workspace),
  ]
}
