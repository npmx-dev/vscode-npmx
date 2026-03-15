import type { ModuleReplacement } from 'module-replacements'
import type { DiagnosticRule } from '..'
import { getReplacement } from '#api/replacement'
import { config } from '#state'
import { checkIgnored } from '#utils/ignore'
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
        message: `can be replaced with ${replacement.replacement}, available since Node ${replacement.nodeVersion}.`,
        link: getMdnUrl(replacement.mdnPath),
      }
    case 'simple':
      return {
        message: `has been flagged as redundant by the community, with the advice:\n${replacement.replacement}.`,
      }
    case 'documented':
      return {
        message: 'has been flagged as having more performant alternatives by the community.',
        link: getReplacementsDocUrl(replacement.docPath),
      }
    case 'none':
      return {
        message: 'has been flagged as no longer needed, and its functionality is likely available natively in all engines.',
      }
  }
}

export const checkReplacement: DiagnosticRule = async ({ dep: { nameRange, resolvedName } }) => {
  if (checkIgnored({ ignoreList: config.ignore.replacement, name: resolvedName }))
    return

  const replacement = await getReplacement(resolvedName)
  if (!replacement)
    return

  const { message, link } = getReplacementInfo(replacement)

  return {
    range: nameRange,
    message: `"${resolvedName}" ${message}`,
    severity: DiagnosticSeverity.Warning,
    code: link ? { value: 'replacement', target: Uri.parse(link) } : 'replacement',
  }
}
