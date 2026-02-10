import type { ModuleReplacement } from 'module-replacements'
import type { DiagnosticRule } from '..'
import { getReplacement } from '#utils/api/replacement'
import { DiagnosticSeverity, Uri } from 'vscode'

function getMdnUrl(path: string): string {
  return `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/${path}`
}

function getReplacementsDocUrl(path: string): string {
  return `https://e18e.dev/docs/replacements/${path}.html`
}

/**
 * Keep messages in sync with npmx.dev wording.
 *
 * https://github.com/npmx-dev/npmx.dev/blob/main/app/components/PackageReplacement.vue#L8-L30
 */
function getReplacementInfo(replacement: ModuleReplacement) {
  switch (replacement.type) {
    case 'native':
      return {
        message: `This can be replaced with ${replacement.replacement}, available since Node ${replacement.nodeVersion}.`,
        link: getMdnUrl(replacement.mdnPath),
      }
    case 'simple':
      return {
        message: `The community has flagged this package as redundant, with the advice:\n${replacement.replacement}.`,
      }
    case 'documented':
      return {
        message: 'The community has flagged this package as having more performant alternatives.',
        link: getReplacementsDocUrl(replacement.docPath),
      }
    case 'none':
      return {
        message: 'This package has been flagged as no longer needed, and its functionality is likely available natively in all engines.',
      }
  }
}

export const checkReplacement: DiagnosticRule = async (dep) => {
  const replacement = await getReplacement(dep.name)
  if (!replacement)
    return

  const { message, link } = getReplacementInfo(replacement)

  return {
    node: dep.nameNode,
    message,
    severity: DiagnosticSeverity.Warning,
    code: link ? { value: 'replacement', target: Uri.parse(link) } : 'replacement',
  }
}
