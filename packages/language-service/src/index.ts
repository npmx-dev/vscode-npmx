import type { LanguageServicePlugin } from '@volar/language-service'
import type { IWorkspaceState } from './types'
import { create as createNpmxCatalogService } from './plugins/catalog'
import { create as createNpmxCompletionService } from './plugins/completion'
import { create as createNpmxDiagnosticsService } from './plugins/diagnostics'
import { create as createNpmxHoverService } from './plugins/hover'

export function createNpmxLanguageServicePlugins(workspace: IWorkspaceState): LanguageServicePlugin[] {
  return [
    createNpmxCatalogService(workspace),
    createNpmxCompletionService(workspace),
    createNpmxDiagnosticsService(workspace),
    createNpmxHoverService(workspace),
  ]
}
