import type { LanguageServiceContext } from '@volar/language-service'
import type { ConfigKey, ConfigKeyTypeMap } from 'npmx-shared/meta'
import { scopedConfigs } from 'npmx-shared/meta'

type ConfigValue = ConfigKeyTypeMap[ConfigKey]

const defaultConfigs = {
  'npmx.hover.enabled': scopedConfigs.defaults['hover.enabled'],
  'npmx.completion.version': scopedConfigs.defaults['completion.version'],
  'npmx.completion.excludePrerelease': scopedConfigs.defaults['completion.excludePrerelease'],
  'npmx.diagnostics.upgrade': scopedConfigs.defaults['diagnostics.upgrade'],
  'npmx.diagnostics.deprecation': scopedConfigs.defaults['diagnostics.deprecation'],
  'npmx.diagnostics.replacement': scopedConfigs.defaults['diagnostics.replacement'],
  'npmx.diagnostics.vulnerability': scopedConfigs.defaults['diagnostics.vulnerability'],
  'npmx.diagnostics.distTag': scopedConfigs.defaults['diagnostics.distTag'],
  'npmx.diagnostics.engineMismatch': scopedConfigs.defaults['diagnostics.engineMismatch'],
  'npmx.packageLinks': scopedConfigs.defaults.packageLinks,
  'npmx.ignore.upgrade': scopedConfigs.defaults['ignore.upgrade'],
  'npmx.ignore.deprecation': scopedConfigs.defaults['ignore.deprecation'],
  'npmx.ignore.replacement': scopedConfigs.defaults['ignore.replacement'],
  'npmx.ignore.vulnerability': scopedConfigs.defaults['ignore.vulnerability'],
} satisfies { [K in ConfigKey]: ConfigKeyTypeMap[K] }

export function getConfig(context: LanguageServiceContext, section: 'npmx.hover.enabled'): Promise<boolean>
export function getConfig(context: LanguageServiceContext, section: 'npmx.completion.version'): Promise<'all' | 'provenance-only' | 'off'>
export function getConfig(context: LanguageServiceContext, section: 'npmx.completion.excludePrerelease'): Promise<boolean>
export function getConfig(context: LanguageServiceContext, section: 'npmx.diagnostics.upgrade'): Promise<boolean>
export function getConfig(context: LanguageServiceContext, section: 'npmx.diagnostics.deprecation'): Promise<boolean>
export function getConfig(context: LanguageServiceContext, section: 'npmx.diagnostics.replacement'): Promise<boolean>
export function getConfig(context: LanguageServiceContext, section: 'npmx.diagnostics.vulnerability'): Promise<boolean>
export function getConfig(context: LanguageServiceContext, section: 'npmx.diagnostics.distTag'): Promise<boolean>
export function getConfig(context: LanguageServiceContext, section: 'npmx.diagnostics.engineMismatch'): Promise<boolean>
export function getConfig(context: LanguageServiceContext, section: 'npmx.packageLinks'): Promise<'off' | 'latest' | 'declared' | 'resolved'>
export function getConfig(context: LanguageServiceContext, section: 'npmx.ignore.upgrade'): Promise<string[]>
export function getConfig(context: LanguageServiceContext, section: 'npmx.ignore.deprecation'): Promise<string[]>
export function getConfig(context: LanguageServiceContext, section: 'npmx.ignore.replacement'): Promise<string[]>
export function getConfig(context: LanguageServiceContext, section: 'npmx.ignore.vulnerability'): Promise<string[]>
export async function getConfig(context: LanguageServiceContext, section: ConfigKey): Promise<ConfigValue> {
  const getConfiguration = context.env.getConfiguration
  const fallback = getDefaultConfig(section)
  if (!getConfiguration)
    return fallback

  const exact = validateConfig(await getConfiguration(section), section)
  if (exact !== undefined)
    return exact

  const scopedSection = section.slice(scopedConfigs.scope.length + 1)
  const scoped = validateConfig(await getConfiguration(scopedSection), section)
  if (scoped !== undefined)
    return scoped

  const root = readConfigFromRoot(await getConfiguration(scopedConfigs.scope), section)
  if (root !== undefined)
    return root

  return fallback
}

function getDefaultConfig(section: ConfigKey): ConfigValue {
  return defaultConfigs[section]
}

function validateConfig(value: unknown, section: ConfigKey): ConfigValue | undefined {
  switch (section) {
    case 'npmx.hover.enabled':
    case 'npmx.completion.excludePrerelease':
    case 'npmx.diagnostics.upgrade':
    case 'npmx.diagnostics.deprecation':
    case 'npmx.diagnostics.replacement':
    case 'npmx.diagnostics.vulnerability':
    case 'npmx.diagnostics.distTag':
    case 'npmx.diagnostics.engineMismatch':
      return typeof value === 'boolean' ? value : undefined
    case 'npmx.completion.version':
      return value === 'all' || value === 'provenance-only' || value === 'off'
        ? value
        : undefined
    case 'npmx.packageLinks':
      return value === 'off' || value === 'latest' || value === 'declared' || value === 'resolved'
        ? value
        : undefined
    case 'npmx.ignore.upgrade':
    case 'npmx.ignore.deprecation':
    case 'npmx.ignore.replacement':
    case 'npmx.ignore.vulnerability':
      return isStringArray(value) ? value : undefined
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function readConfigFromRoot(value: unknown, section: ConfigKey): ConfigValue | undefined {
  if (!isObject(value))
    return

  const root = isObject(value.npmx) ? value.npmx : value

  switch (section) {
    case 'npmx.hover.enabled':
      return validateConfig(isObject(root.hover) ? root.hover.enabled : undefined, section)
    case 'npmx.completion.version':
      return validateConfig(isObject(root.completion) ? root.completion.version : undefined, section)
    case 'npmx.completion.excludePrerelease':
      return validateConfig(isObject(root.completion) ? root.completion.excludePrerelease : undefined, section)
    case 'npmx.diagnostics.upgrade':
      return validateConfig(isObject(root.diagnostics) ? root.diagnostics.upgrade : undefined, section)
    case 'npmx.diagnostics.deprecation':
      return validateConfig(isObject(root.diagnostics) ? root.diagnostics.deprecation : undefined, section)
    case 'npmx.diagnostics.replacement':
      return validateConfig(isObject(root.diagnostics) ? root.diagnostics.replacement : undefined, section)
    case 'npmx.diagnostics.vulnerability':
      return validateConfig(isObject(root.diagnostics) ? root.diagnostics.vulnerability : undefined, section)
    case 'npmx.diagnostics.distTag':
      return validateConfig(isObject(root.diagnostics) ? root.diagnostics.distTag : undefined, section)
    case 'npmx.diagnostics.engineMismatch':
      return validateConfig(isObject(root.diagnostics) ? root.diagnostics.engineMismatch : undefined, section)
    case 'npmx.packageLinks':
      return validateConfig(root.packageLinks, section)
    case 'npmx.ignore.upgrade':
      return validateConfig(isObject(root.ignore) ? root.ignore.upgrade : undefined, section)
    case 'npmx.ignore.deprecation':
      return validateConfig(isObject(root.ignore) ? root.ignore.deprecation : undefined, section)
    case 'npmx.ignore.replacement':
      return validateConfig(isObject(root.ignore) ? root.ignore.replacement : undefined, section)
    case 'npmx.ignore.vulnerability':
      return validateConfig(isObject(root.ignore) ? root.ignore.vulnerability : undefined, section)
  }
}
