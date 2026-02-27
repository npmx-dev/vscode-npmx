import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    alias: {
      vscode: join(rootDir, '/tests/__mocks__/vscode.ts'),
    },
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/__setup__/index.ts'],
  },
})
