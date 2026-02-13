import type { DependencyInfo, ValidNode } from '#types/extractor'
import type { PackageInfo } from '#utils/api/package'
import type { Awaitable } from 'reactive-vscode'
import type { Diagnostic } from 'vscode'
import { useActiveExtractor } from '#composables/active-extractor'
import { config, logger } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { debounce } from 'perfect-debounce'
import { computed, useActiveTextEditor, useDisposable, useDocumentText, watch } from 'reactive-vscode'
import { languages } from 'vscode'
import { displayName } from '../../generated-meta'
import { checkDeprecation } from './rules/deprecation'
import { checkReplacement } from './rules/replacement'
import { checkUpgrade } from './rules/upgrade'
import { checkVulnerability } from './rules/vulnerability'

export interface NodeDiagnosticInfo extends Omit<Diagnostic, 'range' | 'source'> {
  node: ValidNode
}
export type DiagnosticRule = (dep: DependencyInfo, pkg: PackageInfo) => Awaitable<NodeDiagnosticInfo | undefined>

export function useDiagnostics() {
  const diagnosticCollection = useDisposable(languages.createDiagnosticCollection(displayName))

  const activeEditor = useActiveTextEditor()
  const activeDocumentText = useDocumentText(() => activeEditor.value?.document)
  const activeExtractor = useActiveExtractor()

  const enabledRules = computed<DiagnosticRule[]>(() => {
    const rules: DiagnosticRule[] = []
    if (config.diagnostics.upgrade)
      rules.push(checkUpgrade)
    if (config.diagnostics.deprecation)
      rules.push(checkDeprecation)
    if (config.diagnostics.replacement)
      rules.push(checkReplacement)
    if (config.diagnostics.vulnerability)
      rules.push(checkVulnerability)
    return rules
  })

  async function collectDiagnostics() {
    const extractor = activeExtractor.value
    const document = activeEditor.value?.document
    if (!extractor || !document)
      return

    diagnosticCollection.delete(document.uri)

    if (enabledRules.value.length === 0)
      return

    const root = extractor.parse(document)
    if (!root)
      return

    const dependencies = extractor.getDependenciesInfo(root)
    const diagnostics: Diagnostic[] = []

    const flush = debounce(() => {
      diagnosticCollection.set(document.uri, [...diagnostics])
    }, 100)

    dependencies.forEach(async (dep) => {
      try {
        const pkg = await getPackageInfo(dep.name)
        if (!pkg)
          return

        enabledRules.value.forEach(async (rule) => {
          const diagnostic = await rule(dep, pkg)

          if (diagnostic) {
            diagnostics.push({
              source: displayName,
              range: extractor.getNodeRange(document, diagnostic.node),
              ...diagnostic,
            })

            flush()
          }
        })
      } catch (err) {
        logger.warn(`Failed to check ${dep.name}: ${err}`)
      }
    })
  }

  watch(activeDocumentText, collectDiagnostics, { immediate: true })
}
