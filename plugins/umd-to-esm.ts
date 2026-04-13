import type { Rolldown } from 'tsdown'
import { createRequire } from 'node:module'

const targets = [
  /^vscode-.*-languageservice$/,
  /^vscode-languageserver-types$/,
  /^jsonc-parser$/,
]

const UMD_SEGMENT_PATTERN = /[/\\]umd[/\\]/

export function toEsmPath(resolvedModulePath: string) {
  return resolvedModulePath.replace(UMD_SEGMENT_PATTERN, (matchedSegment) => matchedSegment.replace('umd', 'esm'))
}

export function umdToEsm(): Rolldown.RolldownPlugin {
  return {
    name: 'umd-to-esm',
    resolveId: {
      filter: {
        id: targets,
      },
      handler(source, importer) {
        const require = createRequire(importer ?? import.meta.url)
        const resolvedModulePath = require.resolve(source)
        const resolvedEsmPath = toEsmPath(resolvedModulePath)
        return { id: resolvedEsmPath }
      },
    },
  }
}
