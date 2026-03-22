import { createRequire } from 'node:module'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  platform: 'node',
  exports: true,
  format: 'cjs',
  checks: {
    // @volar/language-server@2.4.28
    eval: false,
  },
  minify: 'dce-only',
  deps: {
    onlyBundle: [
      /^vscode-/,
      /^@volar\//,
      'request-light',
      'path-browserify',
    ],
  },
  plugins: [
    {
      name: 'umd-to-esm',
      resolveId: {
        filter: {
          id: /^(vscode-.*-languageservice|vscode-languageserver-types)$/,
        },
        handler(source, importer) {
          const require = createRequire(importer!)
          const pathUmdMay = require.resolve(source)
          const pathEsm = pathUmdMay.replace('/umd/', '/esm/')
          return { id: pathEsm }
        },
      },
    },
  ],
})
