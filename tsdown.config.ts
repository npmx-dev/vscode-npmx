import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

/// keep-sorted
export default defineConfig({
  alias: {
    // defaults to bundle the UMD entry point and generate incorrect output.
    // so explicitly specifying a fixed entry point here.
    'jsonc-parser': resolve('./node_modules/jsonc-parser/lib/esm/main.js'),
  },
  deps: {
    neverBundle: ['vscode'],
    /// keep-sorted
    onlyAllowBundle: [
      'fast-npm-meta',
      'jsonc-parser',
      'ofetch',
      'pathe',
      'perfect-debounce',
      'semver',
      'vscode-find-up',
      'yaml',
      /reactive-vscode/,
    ],
  },
  dts: false,
  minify: 'dce-only',
  platform: 'neutral',
})
