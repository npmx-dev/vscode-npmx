import { defineConfig } from '@vida0905/eslint-config'

const RESTRICTED_IMPORTS_NODE = {
  regex: '^node:',
  message: 'Node.js built-in modules are not available in browser environments.',
}

export default defineConfig(
  {
    pnpm: true,
    typescript: true,
    ignores: ['playground', 'tests/fixtures'],
  },
  {
    name: 'extensions/all',
    files: ['src/**/*'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '^semver$',
            message: 'Please use the subpath import for smaller bundle size',
          },
          RESTRICTED_IMPORTS_NODE,
        ],
      }],
    },
  },
  {
    name: 'extensions/commands',
    files: ['src/commands/**'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'reactive-vscode',
            message: 'Do not use reactive-vscode composables in command handlers. Use vscode API directly.',
          },
        ],
        patterns: [RESTRICTED_IMPORTS_NODE],
      }],
    },
  },
)
