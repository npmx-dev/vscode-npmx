import { defineConfig } from 'tsdown'
import { umdToEsm } from '../../plugins/umd-to-esm.ts'

export default defineConfig({
  /// keep-sorted
  entry: [
    'src/api/*',
    'src/constants.ts',
    'src/extractors/index.ts',
    'src/links.ts',
    'src/types.ts',
    'src/utils/index.ts',
    'src/workspace.ts',
  ],
  platform: 'neutral',
  exports: {
    packageJson: false,
  },
  dts: true,
  minify: 'dce-only',
  deps: {
    /// keep-sorted
    onlyBundle: [
      'fast-npm-meta',
      'jsonc-parser',
      'module-replacements',
      'ofetch',
      'path-browserify',
      'yaml',
    ],
  },
  plugins: [
    umdToEsm(),
  ],
})
