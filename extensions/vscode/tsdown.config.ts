import { defineConfig } from 'tsdown'
import { umdToEsm } from '../../plugins/umd-to-esm.ts'

/// keep-sorted
export default defineConfig({
  copy: [
    '../../res',
    { from: 'node_modules/npmx-language-server/bin/**', to: 'dist/server/bin' },
    { from: 'node_modules/npmx-language-server/dist/**', to: 'dist/server/dist' },
  ],
  deps: {
    neverBundle: ['vscode'],
    /// keep-sorted
    onlyBundle: [
      'balanced-match',
      'brace-expansion',
      'minimatch',
      'ocache',
      'ohash',
      'path-browserify',
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
  plugins: [umdToEsm()],
})
