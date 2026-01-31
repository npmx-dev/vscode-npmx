import type { ModuleReplacement } from 'module-replacements'
import type { DiagnosticRule } from '..'
import { getReplacement } from '#utils/replacement'
import { DiagnosticSeverity } from 'vscode'

// https://github.com/npmx-dev/npmx.dev/blob/main/app/components/PackageReplacement.vue#L8-L30
function generateMessage(replacement: ModuleReplacement) {
  switch (replacement.type) {
    case 'native':
      return `This can be replaced with ${replacement.replacement}, available since Node ${replacement.nodeVersion}.`
    case 'simple':
      return `The community has flagged this package as redundant, with the advice: ${replacement.replacement}.`
    case 'documented':
      return 'The community has flagged this package as having more performant alternatives.'
    case 'none':
      return 'This package has been flagged as no longer needed, and its functionality is likely available natively in all engines.'
  }
}

export const checkReplacement: DiagnosticRule = async (dep) => {
  const replacement = await getReplacement(dep.name)
  // Fallback for cache compatibility (LRUCache rejects null/undefined)
  if (!replacement || !('type' in replacement))
    return

  return {
    node: dep.nameNode,
    message: generateMessage(replacement),
    severity: DiagnosticSeverity.Warning,
  }
}
