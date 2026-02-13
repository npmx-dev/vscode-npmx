import type { Extractor } from '#types/extractor'
import { PACKAGE_JSON_BASENAME, PNPM_WORKSPACE_BASENAME } from '#constants'
import { computed, useActiveTextEditor } from 'reactive-vscode'
import { Utils } from 'vscode-uri'
import { PackageJsonExtractor } from '../extractors/package-json'
import { PnpmWorkspaceYamlExtractor } from '../extractors/pnpm-workspace-yaml'

const extractorMapping: Record<string, Extractor> = {
  [PACKAGE_JSON_BASENAME]: new PackageJsonExtractor(),
  [PNPM_WORKSPACE_BASENAME]: new PnpmWorkspaceYamlExtractor(),
}

export const extractorEntries = Object.entries(extractorMapping)
  .map(([basename, extractor]) => ({ basename, pattern: `**/${basename}`, extractor }))

export function useActiveExtractor() {
  const activeEditor = useActiveTextEditor()

  return computed(() => {
    const editor = activeEditor.value
    if (!editor)
      return
    return extractorMapping[Utils.basename(editor.document.uri)]
  })
}
