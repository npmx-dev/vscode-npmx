import { createRequire } from 'node:module'
import { defineConfig } from 'tsdown'

/// keep-sorted
export default defineConfig({
  copy: [
    '../../res',
    // { from: 'node_modules/npmx-language-server/bin/**', to: 'dist/server/bin' },
    // { from: 'node_modules/npmx-language-server/dist/**', to: 'dist/server/dist' },
  ],
  deps: {
    neverBundle: ['vscode'],
    /// keep-sorted
    onlyBundle: [
      'balanced-match',
      'brace-expansion',
      'minimatch',
      'ocache',
      'ofetch',
      'ohash',
      'path-browserify',
      'perfect-debounce',
      'semver',
      'typescript',
      'vscode-find-up',
      /@volar/,
      /reactive-vscode/,
      /vscode-/,
    ],
  },
  dts: false,
  format: 'cjs',
  minify: 'dce-only',
  platform: 'neutral',
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
