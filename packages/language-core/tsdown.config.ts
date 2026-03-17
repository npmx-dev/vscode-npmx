import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

export default defineConfig({
  alias: {
    // defaults to bundle the UMD entry point and generate incorrect output.
    // so explicitly specifying a fixed entry point here.
    'jsonc-parser': resolve('./node_modules/jsonc-parser/lib/esm/main.js'),
  },
  /// keep-sorted
  entry: [
    'src/constants.ts',
    'src/extractors/index.ts',
    'src/types.ts',
    'src/utils/index.ts',
  ],
  platform: 'neutral',
  exports: true,
  dts: true,
  minify: 'dce-only',
  deps: {
    /// keep-sorted
    onlyBundle: [
      'jsonc-parser',
      'pathe',
      'yaml',
    ],
  },
})
