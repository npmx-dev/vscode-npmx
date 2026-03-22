import type { Rolldown } from 'tsdown'
import { createRequire } from 'node:module'

const targets = [
  /^vscode-.*-languageservice$/,
  /^vscode-languageserver-types$/,
  /^jsonc-parser$/,
]

export function umdToEsm(): Rolldown.RolldownPlugin {
  return {
    name: 'umd-to-esm',
    resolveId: {
      filter: {
        id: targets,
      },
      handler(source, importer) {
        const require = createRequire(importer!)
        const pathUmdMay = require.resolve(source)
        const pathEsm = pathUmdMay.replace('/umd/', '/esm/')
        return { id: pathEsm }
      },
    },
  }
}
