import type { DependencyInfo, Extractor, ValidNode } from '#types/extractor'
import type { PackageInfo } from '#utils/api/package'
import type { Awaitable } from 'reactive-vscode'
import type { Diagnostic, TextDocument } from 'vscode'
import { config, logger } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { debounce } from 'perfect-debounce'
import { computed, useActiveTextEditor, useDocumentText, watch } from 'reactive-vscode'
import { languages } from 'vscode'
import { Utils } from 'vscode-uri'
import { displayName } from '../../generated-meta'
import { checkDeprecation } from './rules/deprecation'
import { checkDistTag } from './rules/dist-tag'
import { checkReplacement } from './rules/replacement'
import { checkUpgrade } from './rules/upgrade'
import { checkVulnerability } from './rules/vulnerability'

export interface NodeDiagnosticInfo extends Omit<Diagnostic, 'range' | 'source'> {
  node: ValidNode
}
export type DiagnosticRule = (dep: DependencyInfo, pkg: PackageInfo) => Awaitable<NodeDiagnosticInfo | undefined>

const enabledRules = computed<DiagnosticRule[]>(() => {
  const rules: DiagnosticRule[] = []
  if (config.diagnostics.upgrade)
    rules.push(checkUpgrade)
  if (config.diagnostics.deprecation)
    rules.push(checkDeprecation)
  if (config.diagnostics.distTag)
    rules.push(checkDistTag)
  if (config.diagnostics.replacement)
    rules.push(checkReplacement)
  if (config.diagnostics.vulnerability)
    rules.push(checkVulnerability)
  return rules
})

export function registerDiagnosticCollection(mapping: Record<string, Extractor | undefined>) {
  const diagnosticCollection = languages.createDiagnosticCollection(displayName)

  const activeEditor = useActiveTextEditor()
  const activeDocumentText = useDocumentText(() => activeEditor.value?.document)

  async function collectDiagnostics(document: TextDocument, extractor: Extractor) {
    diagnosticCollection.delete(document.uri)

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

  watch(activeDocumentText, async () => {
    const editor = activeEditor.value
    if (!editor)
      return

    const document = editor.document
    const filename = Utils.basename(document.uri)
    const extractor = mapping[filename]

    if (extractor)
      await collectDiagnostics(document, extractor)
  }, { immediate: true })
}
