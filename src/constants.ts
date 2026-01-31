export const PACKAGE_JSON_PATTERN = '**/package.json'
export const PNPM_WORKSPACE_PATTERN = '**/pnpm-workspace.yaml'

export const VERSION_TRIGGER_CHARACTERS = ['.', '^', '~', ...Array.from({ length: 10 }).map((_, i) => `${i}`)]

export const NPM_REGISTRY = 'https://registry.npmjs.org'
