export const PACKAGE_JSON_BASENAME = 'package.json'
export const NODE_MODULES_BASENAME = 'node_modules'
export const PNPM_WORKSPACE_BASENAME = 'pnpm-workspace.yaml'
export const YARN_WORKSPACE_BASENAME = '.yarnrc.yml'

export const DEPENDENCY_FILE_GLOB = `**/{${PACKAGE_JSON_BASENAME},${PNPM_WORKSPACE_BASENAME},${YARN_WORKSPACE_BASENAME}}`

export const CACHE_MAX_AGE_ONE_DAY = 60 * 60 * 24

export const NPMX_DEV = 'https://npmx.dev'
export const NPMX_DEV_API = `${NPMX_DEV}/api`
