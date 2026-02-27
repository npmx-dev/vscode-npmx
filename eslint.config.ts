import { defineConfig } from '@vida0905/eslint-config'

export default defineConfig(
  {
    pnpm: true,
    ignores: ['playground'],
  },
  {
    files: ['src/commands/**'],
    ignores: ['**/index.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'reactive-vscode',
          allowImportNames: ['useCommand', 'useCommands', 'useTextEditorCommand', 'useTextEditorCommands'],
          allowTypeImports: true,
          message: 'Do not use reactive-vscode composables in command handlers. Use vscode API directly.',
        }],
      }],
    },
  },
)
