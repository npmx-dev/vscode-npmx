import { WORKSPACE_MANIFEST_FILENAME } from '@pnpm/constants'

export const PACKAGE_JSON_BASENAME = 'package.json'

export const PACKAGE_JSON_PATTERN = `**/${PACKAGE_JSON_BASENAME}`
export const PNPM_WORKSPACE_PATTERN = `**/${WORKSPACE_MANIFEST_FILENAME}`

export const VERSION_TRIGGER_CHARACTERS = [':', '^', '~', '.', ...Array.from({ length: 10 }).map((_, i) => `${i}`)]
export const PRERELEASE_PATTERN = /-.+/

export const CACHE_TTL_ONE_DAY = 1000 * 60 * 60 * 24

export const NPMX_DEV = 'https://npmx.dev'
export const NPMX_DEV_API = `${NPMX_DEV}/api`

export const SPACER = '&nbsp;'

export const UPGRADE_MESSAGE_PREFIX = 'New version available: '
