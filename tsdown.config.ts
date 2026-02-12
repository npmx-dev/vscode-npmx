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
  /// keep-sorted
  inlineOnly: [
    '@pnpm/catalogs.config',
    '@pnpm/catalogs.protocol-parser',
    '@pnpm/catalogs.resolver',
    '@pnpm/constants',
    '@pnpm/error',
    '@reactive-vscode/reactivity',
    'fast-npm-meta',
    'jsonc-parser',
    'ofetch',
    'perfect-debounce',
    'reactive-vscode',
    'yaml',
  ],
  minify: 'dce-only',
  outputOptions: {
    codeSplitting: false,
  },
})
