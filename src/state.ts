import type { NestedScopedConfigs } from './generated-meta'
import { defineConfigObject, defineLogger } from 'reactive-vscode'
import { displayName, scopedConfigs } from './generated-meta'

export const config = defineConfigObject<NestedScopedConfigs>(
  scopedConfigs.scope,
  scopedConfigs.defaults,
)

export const logger = defineLogger(displayName)
