export const PACKAGE_JSON_BASENAME = 'package.json'
export const NODE_MODULES_BASENAME = 'node_modules'
export const PNPM_WORKSPACE_BASENAME = 'pnpm-workspace.yaml'
export const YARN_WORKSPACE_BASENAME = '.yarnrc.yml'

export const DEPENDENCY_FILE_GLOB = `**/{${PACKAGE_JSON_BASENAME},${PNPM_WORKSPACE_BASENAME},${YARN_WORKSPACE_BASENAME}}`

export const CACHE_MAX_AGE_ONE_DAY = 60 * 60 * 24

/**
 * The maximum cache age (in seconds) accepted by `ocache`'s `maxAge` option.
 *
 * This is the largest whole number of seconds that can be expressed within a
 * 32-bit signed integer (`(2 ** 31 - 1) / 1000 ≈ 596523` hours). It acts as a
 * safe upper bound for caches that should effectively live forever.
 *
 * This was introduced to cope with a breaking change in `ocache`: the previous
 * idiom of passing `-1` to disable expiration is no longer supported, so we
 * pass the largest valid `maxAge` instead to keep entries from expiring.
 */
export const CACHE_MAX_AGE_MAXIMUM = Math.trunc((2 ** 31 - 1) / 1000)

export const NPMX_DEV = 'https://npmx.dev'
export const NPMX_DEV_API = `${NPMX_DEV}/api`
