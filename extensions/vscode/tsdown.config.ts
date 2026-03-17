import { defineConfig } from 'tsdown'

/// keep-sorted
export default defineConfig({
  copy: [
    '../../res',
  ],
  deps: {
    neverBundle: ['vscode'],
    /// keep-sorted
    onlyBundle: [
      'fast-npm-meta',
      'ocache',
      'ofetch',
      'ohash',
      'pathe',
      'perfect-debounce',
      'semver',
      'vscode-find-up',
      /reactive-vscode/,
    ],
  },
  dts: false,
  minify: 'dce-only',
  platform: 'neutral',
})
