import type { Extractor } from '#types/extractor'
import type { TextDocument } from 'vscode'
import { basename } from 'node:path'
import { logger } from '#state'
import { getPackageInfo } from '#utils/npm'
import { extractVersion } from '#utils/version'
import { useActiveTextEditor, useDocumentText, watch } from 'reactive-vscode'
import { Diagnostic, DiagnosticSeverity, languages } from 'vscode'

export function useDeprecationDiagnostics(mapping: Record<string, Extractor>) {
  const diagnosticCollection = languages.createDiagnosticCollection('npmx')

  const activeEditor = useActiveTextEditor()
  const activeDocumentText = useDocumentText(() => activeEditor.value?.document)

  async function checkDeprecations(document: TextDocument, extractor: Extractor) {
    diagnosticCollection.delete(document.uri)

    const root = extractor.parse(document)
    if (!root) {
      return
    }

    const dependencies = extractor.getDependenciesInfo(root)
    const diagnostics: Diagnostic[] = []

    await Promise.all(
      dependencies.map(async ({ versionNode, name, version }) => {
        try {
          const pkg = await getPackageInfo(name)
          const exactVersion = extractVersion(version)
          const versionInfo = pkg.versions[exactVersion]

          if (!versionInfo?.deprecated)
            return

          const range = extractor.getNodeRange(document, versionNode)
          const diagnostic = new Diagnostic(
            range,
            `${name} v${exactVersion} has been deprecated: ${versionInfo.deprecated}`,
            DiagnosticSeverity.Error,
          )
          diagnostic.source = 'npmx'
          diagnostics.push(diagnostic)
        } catch (err) {
          logger.warn(`Failed to check ${name}: ${err}`)
        }
      }),
    )

    if (diagnostics.length > 0)
      logger.info(`Found ${diagnostics.length} deprecated packages in ${basename(document.fileName)}`)

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
      await checkDeprecations(document, extractor)
  }, { immediate: true })
}
