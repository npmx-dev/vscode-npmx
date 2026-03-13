import type { NestedScopedConfigs } from '#shared/meta'
import { displayName, scopedConfigs } from '#shared/meta'
import { defineConfig, defineLogger } from 'reactive-vscode'

export const config = defineConfig<NestedScopedConfigs>(scopedConfigs.scope)

export const logger = defineLogger(displayName)

export const internalCommands = {
  addToIgnore: `${displayName}.addToIgnore`,
}
