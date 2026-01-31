import type { DependencyInfo, Extractor, ValidNode } from '#types/extractor'
import type { ResolvedPackument } from '#utils/npm'
import type { Diagnostic, TextDocument } from 'vscode'
import { basename } from 'node:path'
import { logger } from '#state'
import { getPackageInfo } from '#utils/npm'
import { useActiveTextEditor, useDocumentText, watch } from 'reactive-vscode'
import { languages } from 'vscode'
import { displayName } from '../../generated-meta'
import { checkDeprecations } from './rules/deprecation'

export interface DiagnosticRuleDetails extends Pick<Diagnostic, 'message' | 'severity'> {
  node: ValidNode
}
export type DiagnosticRule = (dep: DependencyInfo, pkg: ResolvedPackument) => DiagnosticRuleDetails | undefined

const rules: DiagnosticRule[] = [
  checkDeprecations,
]

export function registerDiagnosticCollection(mapping: Record<string, Extractor | undefined>) {
  const diagnosticCollection = languages.createDiagnosticCollection(displayName)

  const activeEditor = useActiveTextEditor()
  const activeDocumentText = useDocumentText(() => activeEditor.value?.document)

  async function collectDiagnostics(document: TextDocument, extractor: Extractor) {
    const root = extractor.parse(document)
    if (!root)
      return

    const dependencies = extractor.getDependenciesInfo(root)
    const diagnostics: Diagnostic[] = []

    await Promise.all(
      dependencies.map(async (dep) => {
        try {
          const pkg = await getPackageInfo(dep.name)

          for (const rule of rules) {
            const diagnostic = rule(dep, pkg)

            if (diagnostic) {
              diagnostics.push({
                source: displayName,
                message: diagnostic.message,
                severity: diagnostic.severity,
                range: extractor.getNodeRange(document, diagnostic.node),
              })
            }
          }
        } catch (err) {
          logger.warn(`Failed to check ${dep.name}: ${err}`)
        }
      }),
    )

    diagnosticCollection.set(document.uri, diagnostics)
  }

  watch(activeDocumentText, async () => {
    const editor = activeEditor.value
    if (!editor)
      return

    const document = editor.document
    const filename = basename(document.fileName)
    const extractor = mapping[filename]

    if (extractor)
      await collectDiagnostics(document, extractor)
  }, { immediate: true })
}
