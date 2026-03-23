import { defineConfig } from 'tsdown'
import { umdToEsm } from '../../plugins/umd-to-esm.ts'

export default defineConfig({
  entry: 'src/index.ts',
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
      'semver',
      'ohash',
      'ocache',
    ],
  },
  plugins: [umdToEsm()],
},
)
