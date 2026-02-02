export const PACKAGE_JSON_BASENAME = 'package.json'
export const PNPM_WORKSPACE_BASENAME = 'pnpm-workspace.yaml'

export const PACKAGE_JSON_PATTERN = `**/${PACKAGE_JSON_BASENAME}`
export const PNPM_WORKSPACE_PATTERN = `**/${PNPM_WORKSPACE_BASENAME}`

export const VERSION_TRIGGER_CHARACTERS = ['.', '^', '~', ...Array.from({ length: 10 }).map((_, i) => `${i}`)]

export const CACHE_TTL_ONE_DAY = 1000 * 60 * 60 * 24

export const NPM_REGISTRY = 'https://registry.npmjs.org'
export const NPMX_DEV_API = 'https://npmx.dev/api'
