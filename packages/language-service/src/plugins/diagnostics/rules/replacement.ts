import type { DiagnosticSeverity } from '@volar/language-service'
import type { ModuleReplacement } from 'module-replacements'
import type { DiagnosticRule } from '../types'
import { resolveDocUrl } from 'module-replacements'
import { getReplacement } from 'npmx-language-core/api/replacement'
import { checkIgnored } from 'npmx-language-core/utils'

export function getReplacementNodeVersion(replacement: ModuleReplacement): string | null {
  const nodeEngine = replacement.engines?.find((e) => e.engine === 'nodejs')
  return nodeEngine?.minVersion || null
}

/**
 * Keep messages in sync with npmx.dev wording.
 */
function getReplacementDescription(resolvedName: string, replacement: ModuleReplacement): string {
  switch (replacement.type) {
    case 'native': {
      let desc = `"${resolvedName}" can be replaced with ${replacement.id}`
      const nodeVersion = getReplacementNodeVersion(replacement)
      if (nodeVersion)
        desc += `, available since Node ${nodeVersion}`
      return `${desc}.`
    }
    case 'simple':
      return `"${resolvedName}" has been flagged as redundant by the community, with advice:\n${replacement.description}.`
    case 'documented':
      return `"${resolvedName}" has been flagged as having more performant alternatives by the community.`
    case 'removal':
      return replacement.description
  }
}

export const checkReplacement: DiagnosticRule = async ({ dep: { nameRange, resolvedName } }, ignoreList) => {
  if (checkIgnored({ ignoreList, name: resolvedName }))
    return

  const replacement = await getReplacement(resolvedName)
  if (!replacement)
    return

  const description = getReplacementDescription(resolvedName, replacement.replacement)

  const link = resolveDocUrl(replacement.replacement.url)

  return {
    range: nameRange,
    message: description,
    severity: 2 satisfies typeof DiagnosticSeverity.Warning,
    code: 'replacement',
    ...(link && { codeDescription: { href: link } }),
  }
}
