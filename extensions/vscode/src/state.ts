import type { NestedScopedConfigs } from 'npmx-shared/meta'
import { displayName, scopedConfigs } from 'npmx-shared/meta'
import { defineConfig, defineLogger } from 'reactive-vscode'

export const config = defineConfig<NestedScopedConfigs>(scopedConfigs.scope)

export const logger = defineLogger(displayName)
