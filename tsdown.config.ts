import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

/// keep-sorted
export default defineConfig({
  alias: {
    // defaults to bundle the UMD entry point and generate incorrect output.
    // so explicitly specifying a fixed entry point here.
    'jsonc-parser': resolve('./node_modules/jsonc-parser/lib/esm/main.js'),
  },
  external: ['vscode'],
  inlineOnly: [
    'reactive-vscode',
    '@reactive-vscode/reactivity',
    'jsonc-parser',
    'yaml',
    'ofetch',
    'fast-npm-meta',
    'perfect-debounce',
    'semver',
  ],
  minify: 'dce-only',
})
