import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: [
      'tests/__setup__/index.ts',
    ],
    server: {
      deps: {
        inline: [
          'reactive-vscode',
          'vscode-find-up',
        ],
      },
    },
  },
})
