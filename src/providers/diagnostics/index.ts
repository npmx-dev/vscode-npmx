import type { DependencyInfo, Extractor, ValidNode } from '#types/extractor'
import type { PackageInfo } from '#utils/api/package'
import type { ParsedVersion } from '#utils/version'
import type { Engines } from 'fast-npm-meta'
import type { Awaitable } from 'reactive-vscode'
import type { Diagnostic, TextDocument } from 'vscode'
import { extractorEntries } from '#extractors'
import { config, logger } from '#state'
import { getPackageInfo } from '#utils/api/package'
import { resolveExactVersion } from '#utils/package'
import { isSupportedProtocol, parseVersion } from '#utils/version'
import { debounce } from 'perfect-debounce'
import { computed, useActiveTextEditor, useDisposable, useDocumentText, watch } from 'reactive-vscode'
import { languages } from 'vscode'
import { displayName } from '../../generated-meta'
import { checkDeprecation } from './rules/deprecation'
import { checkDistTag } from './rules/dist-tag'
import { checkEngineMismatch } from './rules/engine-mismatch'
import { checkReplacement } from './rules/replacement'
import { checkUpgrade } from './rules/upgrade'
import { checkVulnerability } from './rules/vulnerability'

export interface DiagnosticContext {
  dep: DependencyInfo
  pkg: PackageInfo
  parsed: ParsedVersion | null
  exactVersion: string | null
  engines: Engines | undefined
}

export interface NodeDiagnosticInfo extends Omit<Diagnostic, 'range' | 'source'> {
  node: ValidNode
}
export type DiagnosticRule = (ctx: DiagnosticContext) => Awaitable<NodeDiagnosticInfo | undefined>

export function useDiagnostics() {
  const diagnosticCollection = useDisposable(languages.createDiagnosticCollection(displayName))

  const activeEditor = useActiveTextEditor()
  const activeDocumentText = useDocumentText(() => activeEditor.value?.document)

  const enabledRules = computed<DiagnosticRule[]>(() => {
    const rules: DiagnosticRule[] = []
    if (config.diagnostics.upgrade)
      rules.push(checkUpgrade)
    if (config.diagnostics.deprecation)
      rules.push(checkDeprecation)
    if (config.diagnostics.distTag)
      rules.push(checkDistTag)
    if (config.diagnostics.engineMismatch)
      rules.push(checkEngineMismatch)
    if (config.diagnostics.replacement)
      rules.push(checkReplacement)
    if (config.diagnostics.vulnerability)
      rules.push(checkVulnerability)
    return rules
  })

  const hasEnabledRules = computed(() => enabledRules.value.length > 0)

  function isDocumentChanged(document: TextDocument, targetVersion: number) {
    return document.version !== targetVersion
  }

  async function collectDiagnostics(document: TextDocument, extractor: Extractor) {
    logger.info(`[diagnostics] collect: ${document.uri.path}`)
    diagnosticCollection.delete(document.uri)

    if (!hasEnabledRules.value)
      return

    const root = extractor.parse(document)
    if (!root)
      return

    const targetVersion = document.version

    const dependencies = extractor.getDependenciesInfo(root)
    const engines = extractor.getEngines?.(root)
    const diagnostics: Diagnostic[] = []

    const flush = debounce((document: TextDocument, targetVersion: number, diagnostics: Diagnostic[]) => {
      if (isDocumentChanged(document, targetVersion))
        return

      diagnosticCollection.set(document.uri, [...diagnostics])
      logger.info(`[diagnostics] flush: ${document.uri.path}`)
    }, 50)

    const runRule = async (rule: DiagnosticRule, ctx: DiagnosticContext) => {
      try {
        const diagnostic = await rule(ctx)
        if (isDocumentChanged(document, targetVersion))
          return
        if (!diagnostic)
          return

        diagnostics.push({
          source: displayName,
          range: extractor.getNodeRange(document, diagnostic.node),
          ...diagnostic,
        })
        flush(document, targetVersion, diagnostics)
        logger.info(`[diagnostics] set flush: ${document.uri.path}`)
      } catch (err) {
        logger.warn(`[diagnostics] fail to check ${ctx.dep.name} (${rule.name}): ${err}`)
      }
    }

    const collect = async (dep: DependencyInfo) => {
      try {
        const pkg = await getPackageInfo(dep.name)
        if (!pkg || isDocumentChanged(document, targetVersion))
          return

        const parsed = parseVersion(dep.version)
        const exactVersion = parsed && isSupportedProtocol(parsed.protocol)
          ? resolveExactVersion(pkg, parsed.version)
          : null

        for (const rule of enabledRules.value) {
          runRule(rule, { dep, pkg, parsed, exactVersion, engines })
        }
      } catch (err) {
        logger.warn(`[diagnostics] fail to check ${dep.name}: ${err}`)
      }
    }

    for (const dep of dependencies) {
      collect(dep)
    }
  }

  watch([activeDocumentText, enabledRules], () => {
    if (!activeEditor.value)
      return

    const document = activeEditor.value.document
    const extractor = extractorEntries.find(({ pattern }) => languages.match({ pattern }, document))?.extractor
    if (!extractor)
      return

    collectDiagnostics(document, extractor)
  }, { immediate: true })
}
