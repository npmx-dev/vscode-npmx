import type { Extractor } from '#types/extractor'
import { PACKAGE_JSON_BASENAME, PNPM_WORKSPACE_BASENAME } from '#constants'
import { computed, useActiveTextEditor } from 'reactive-vscode'
import { languages } from 'vscode'
import { PackageJsonExtractor } from '../extractors/package-json'
import { PnpmWorkspaceYamlExtractor } from '../extractors/pnpm-workspace-yaml'

export const extractorEntries = [
  { pattern: `**/${PACKAGE_JSON_BASENAME}`, extractor: new PackageJsonExtractor() },
  { pattern: `**/${PNPM_WORKSPACE_BASENAME}`, extractor: new PnpmWorkspaceYamlExtractor() },
]

export function useActiveExtractor() {
  const activeEditor = useActiveTextEditor()

  return computed<Extractor | undefined>(() => {
    const document = activeEditor.value?.document
    if (!document)
      return
    return extractorEntries.find(({ pattern }) => languages.match({ pattern }, document))?.extractor
  })
}
