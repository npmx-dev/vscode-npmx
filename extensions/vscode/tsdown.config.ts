import { defineConfig } from 'tsdown'
import { umdToEsm } from '../../plugins/umd-to-esm.ts'

/// keep-sorted
export default defineConfig({
  copy: [
    '../../res',
    { from: 'node_modules/npmx-language-server/dist/**', to: 'dist/server' },
  ],
  deps: {
    neverBundle: ['vscode'],
    /// keep-sorted
    onlyBundle: [
      '@typescript/typescript6',
      'balanced-match',
      'brace-expansion',
      'minimatch',
      'path-browserify',
      'semver',
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
