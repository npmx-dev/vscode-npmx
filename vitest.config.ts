import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    alias: {
      '#constants': join(rootDir, '/src/constants.ts'),
      '#state': join(rootDir, '/src/state.ts'),
      '#types/*': join(rootDir, '/src/types/*'),
      '#utils/*': join(rootDir, '/src/utils/*'),
      'vscode': join(rootDir, '/tests/__mocks__/vscode.ts'),
    },
    include: ['tests/**/*.test.ts'],
  },
})
