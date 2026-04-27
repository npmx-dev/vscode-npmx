import type { LanguageServiceContext } from '@volar/language-service'
import type { ConfigKey, ConfigKeyTypeMap, ScopedConfigKeyTypeMap } from 'npmx-shared/meta'
import { scopedConfigs } from 'npmx-shared/meta'

type ConfigValue = ConfigKeyTypeMap[ConfigKey]
type ConfigValidator<K extends ConfigKey> = (value: unknown) => ConfigKeyTypeMap[K] | undefined

interface ConfigSpec<K extends ConfigKey> {
  scopedKey: keyof ScopedConfigKeyTypeMap
  validate: ConfigValidator<K>
}

const booleanConfig = (value: unknown): boolean | undefined => typeof value === 'boolean' ? value : undefined

const completionVersionConfig: ConfigValidator<'npmx.completion.version'> = (value) =>
  value === 'all' || value === 'provenance-only' || value === 'off'
    ? value
    : undefined

const packageLinksConfig: ConfigValidator<'npmx.packageLinks'> = (value) =>
  value === 'off' || value === 'latest' || value === 'declared' || value === 'resolved'
    ? value
    : undefined

function stringArrayConfig(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : undefined
}

const configSpecs = {
  'npmx.hover.enabled': {
    scopedKey: 'hover.enabled',
    validate: booleanConfig,
  },
  'npmx.completion.version': {
    scopedKey: 'completion.version',
    validate: completionVersionConfig,
  },
  'npmx.completion.excludePrerelease': {
    scopedKey: 'completion.excludePrerelease',
    validate: booleanConfig,
  },
  'npmx.diagnostics.upgrade': {
    scopedKey: 'diagnostics.upgrade',
    validate: booleanConfig,
  },
  'npmx.diagnostics.deprecation': {
    scopedKey: 'diagnostics.deprecation',
    validate: booleanConfig,
  },
  'npmx.diagnostics.replacement': {
    scopedKey: 'diagnostics.replacement',
    validate: booleanConfig,
  },
  'npmx.diagnostics.vulnerability': {
    scopedKey: 'diagnostics.vulnerability',
    validate: booleanConfig,
  },
  'npmx.diagnostics.distTag': {
    scopedKey: 'diagnostics.distTag',
    validate: booleanConfig,
  },
  'npmx.diagnostics.engineMismatch': {
    scopedKey: 'diagnostics.engineMismatch',
    validate: booleanConfig,
  },
  'npmx.packageLinks': {
    scopedKey: 'packageLinks',
    validate: packageLinksConfig,
  },
  'npmx.ignore.upgrade': {
    scopedKey: 'ignore.upgrade',
    validate: stringArrayConfig,
  },
  'npmx.ignore.deprecation': {
    scopedKey: 'ignore.deprecation',
    validate: stringArrayConfig,
  },
  'npmx.ignore.replacement': {
    scopedKey: 'ignore.replacement',
    validate: stringArrayConfig,
  },
  'npmx.ignore.vulnerability': {
    scopedKey: 'ignore.vulnerability',
    validate: stringArrayConfig,
  },
} satisfies { [K in ConfigKey]: ConfigSpec<K> }

export function getConfig<K extends ConfigKey>(
  context: LanguageServiceContext,
  section: K,
): Promise<ConfigKeyTypeMap[K]>
export async function getConfig(context: LanguageServiceContext, section: ConfigKey): Promise<ConfigValue> {
  const getConfiguration = context.env.getConfiguration
  const spec = configSpecs[section]
  const fallback = getDefaultConfig(spec)

  if (!getConfiguration)
    return fallback

  const exact = spec.validate(await getConfiguration(section))
  if (exact !== undefined)
    return exact

  const scoped = spec.validate(await getConfiguration(spec.scopedKey))
  if (scoped !== undefined)
    return scoped

  const root = readConfigFromRoot(await getConfiguration(scopedConfigs.scope), spec)
  if (root !== undefined)
    return root

  return fallback
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readPath(value: unknown, path: readonly string[]): unknown {
  let current = value
  for (const key of path) {
    if (!isObject(current))
      return

    current = current[key]
  }

  return current
}

function getDefaultConfig(spec: {
  scopedKey: keyof ScopedConfigKeyTypeMap
  validate: (value: unknown) => ConfigValue | undefined
}): ConfigValue {
  const value = spec.validate(scopedConfigs.defaults[spec.scopedKey])
  if (value === undefined)
    throw new Error(`Invalid default configuration for ${String(spec.scopedKey)}`)

  return value
}

function readConfigFromRoot(
  value: unknown,
  spec: {
    scopedKey: keyof ScopedConfigKeyTypeMap
    validate: (value: unknown) => ConfigValue | undefined
  },
): ConfigValue | undefined {
  if (!isObject(value))
    return

  const root = isObject(value.npmx) ? value.npmx : value
  return spec.validate(readPath(root, spec.scopedKey.split('.')))
}
