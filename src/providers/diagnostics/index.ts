import type { ResolvedDependencyInfo } from '#types/context'
import type { OffsetRange } from '#types/extractor'
import type { Engines } from 'fast-npm-meta'
import type { Awaitable } from 'reactive-vscode'
import type { Diagnostic, TextDocument, Uri } from 'vscode'
import { SUPPORTED_DOCUMENT_PATTERN } from '#constants'
import { isSupportedDependencyDocument } from '#extractors'
import { config, logger } from '#state'
import { offsetRangeToRange } from '#utils/ast'
import { resolveExactVersion } from '#utils/package'
import { isSupportedProtocol } from '#utils/version'
import { getPackageContext, getResolvedDependencies } from '#utils/workspace'
import { debounce } from 'perfect-debounce'
import { computed, useActiveTextEditor, useDisposable, useDocumentText, useFileSystemWatcher, watch } from 'reactive-vscode'
import { languages, TabInputText, window, workspace } from 'vscode'
import { displayName } from '../../generated-meta'
import { checkDeprecation } from './rules/deprecation'
import { checkDistTag } from './rules/dist-tag'
import { checkEngineMismatch } from './rules/engine-mismatch'
import { checkReplacement } from './rules/replacement'
import { checkUpgrade } from './rules/upgrade'
import { checkVulnerability } from './rules/vulnerability'

export interface DiagnosticContext {
  dep: ResolvedDependencyInfo
  pkg: NonNullable<Awaited<ReturnType<ResolvedDependencyInfo['packageInfo']>>>
  exactVersion: string | null
  engines: Engines | undefined
}

export interface RangeDiagnosticInfo extends Omit<Diagnostic, 'range' | 'source'> {
  range: OffsetRange
}
export type DiagnosticRule = (ctx: DiagnosticContext) => Awaitable<RangeDiagnosticInfo | undefined>

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

  function isStale(document: TextDocument, targetVersion: number) {
    return document.isClosed || document.version !== targetVersion
  }

  async function collectDiagnostics(document: TextDocument) {
    logger.info(`[diagnostics] collect: ${document.uri.path}`)
    diagnosticCollection.set(document.uri, [])

    const rules = enabledRules.value
    if (rules.length === 0)
      return

    const targetVersion = document.version
    const [dependencies, packageContext] = await Promise.all([
      getResolvedDependencies(document.uri),
      getPackageContext(document.uri),
    ])
    const engines = packageContext?.engines
    const diagnostics: Diagnostic[] = []

    const flush = debounce(() => {
      if (isStale(document, targetVersion))
        return

      diagnosticCollection.set(document.uri, [...diagnostics])
      logger.info(`[diagnostics] flush: ${document.uri.path}`)
    }, 50)

    const runRule = async (rule: DiagnosticRule, ctx: DiagnosticContext) => {
      try {
        const diagnostic = await rule(ctx)
        if (isStale(document, targetVersion))
          return
        if (!diagnostic)
          return

        const { range, ...rest } = diagnostic

        diagnostics.push({
          source: displayName,
          ...rest,
          range: offsetRangeToRange(document, range),
        })
        flush()
        logger.debug(`[diagnostics] set flush: ${document.uri.path}`)
      } catch (err) {
        logger.warn(`[diagnostics] fail to check ${ctx.dep.rawName} (${rule.name}): ${err}`)
      }
    }

    const collect = async (dep: ResolvedDependencyInfo) => {
      try {
        const pkg = await dep.packageInfo()
        if (!pkg || isStale(document, targetVersion))
          return

        const exactVersion = isSupportedProtocol(dep.protocol)
          ? resolveExactVersion(pkg, dep.resolvedSpec)
          : null

        for (const rule of rules) {
          runRule(rule, { dep, pkg, exactVersion, engines })
        }
      } catch (err) {
        logger.warn(`[diagnostics] fail to check ${dep.rawName}: ${err}`)
      }
    }

    // fire-and-forget to progressively display diagnostics as each dep resolves, rather than awaiting all
    for (const dep of dependencies) {
      collect(dep)
    }
  }

  watch([activeDocumentText, enabledRules], () => {
    if (!activeEditor.value)
      return

    const document = activeEditor.value.document
    if (!isSupportedDependencyDocument(document))
      return

    collectDiagnostics(document)
  }, { immediate: true })

  async function recollectByUri(uri: Uri) {
    if (!diagnosticCollection.has(uri))
      return

    const doc = await workspace.openTextDocument(uri)

    collectDiagnostics(doc)
  }

  const { onDidCreate, onDidChange, onDidDelete } = useFileSystemWatcher(SUPPORTED_DOCUMENT_PATTERN)

  onDidCreate(recollectByUri)
  onDidChange(recollectByUri)
  onDidDelete((uri) => diagnosticCollection.delete(uri))

  useDisposable(window.tabGroups.onDidChangeTabs(({ closed }) => {
    closed.forEach((tab) => {
      if (!(tab.input instanceof TabInputText))
        return

      const uri = tab.input.uri
      diagnosticCollection.delete(uri)
      logger.debug(`[diagnostics] close and clear ${uri.path}`)
    })
  }))
}
