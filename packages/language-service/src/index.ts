import type { LanguageServicePlugin } from '@volar/language-service'
import type { IWorkspaceState } from './types'
import { create as createNpmxHoverService } from './plugins/hover'

export function createNpmxLanguageServicePlugins(workspace: IWorkspaceState): LanguageServicePlugin[] {
  return [
    createNpmxHoverService(workspace),
  ]
}
