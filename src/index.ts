import type { Extractor } from '#types/extractor'
import {
  PACKAGE_JSON_BASENAME,
  PACKAGE_JSON_PATTERN,
  PNPM_WORKSPACE_BASENAME,
  PNPM_WORKSPACE_PATTERN,
  VERSION_TRIGGER_CHARACTERS,
} from '#constants'
import { defineExtension, useCommands, watchEffect } from 'reactive-vscode'
import { CodeActionKind, Disposable, languages } from 'vscode'
import { openFileInNpmx } from './commands/open-file-in-npmx'
import { openInBrowser } from './commands/open-in-browser'
import { packageJsonExtractor } from './extractors/package-json'
import { pnpmWorkspaceYamlExtractor } from './extractors/pnpm-workspace-yaml'
import { commands, displayName, version } from './generated-meta'
import { createUpgradeProvider } from './providers/code-actions/upgrade'
import { createVersionCompletionItemProvider } from './providers/completion-item/version'
import { registerDiagnosticCollection } from './providers/diagnostics'
import { createNpmxHoverProvider } from './providers/hover/npmx'
import { config, logger } from './state'

interface ExtractorEntry {
  pattern: string
  extractor: Extractor
}

function useHoverProviders(entries: ExtractorEntry[]) {
  watchEffect((onCleanup) => {
    if (!config.hover.enabled)
      return

    const disposables = entries.map(({ pattern, extractor }) =>
      languages.registerHoverProvider(
        { pattern },
        createNpmxHoverProvider(extractor),
      ),
    )

    onCleanup(() => Disposable.from(...disposables).dispose())
  })
}

function useCompletionProviders(entries: ExtractorEntry[]) {
  watchEffect((onCleanup) => {
    if (config.completion.version === 'off')
      return

    const disposables = entries.map(({ pattern, extractor }) =>
      languages.registerCompletionItemProvider(
        { pattern },
        createVersionCompletionItemProvider(extractor),
        ...VERSION_TRIGGER_CHARACTERS,
      ),
    )

    onCleanup(() => Disposable.from(...disposables).dispose())
  })
}

function useCodeActionProviders(entries: ExtractorEntry[]) {
  watchEffect((onCleanup) => {
    if (!config.diagnostics.upgrade)
      return

    const provider = createUpgradeProvider()
    const options = { providedCodeActionKinds: [CodeActionKind.QuickFix] }
    const disposable = Disposable.from(
      ...entries.map(({ pattern }) =>
        languages.registerCodeActionsProvider({ pattern }, provider, options),
      ),
    )

    onCleanup(() => disposable.dispose())
  })
}

export const { activate, deactivate } = defineExtension(() => {
  logger.info(`${displayName} Activated, v${version}`)

  const entries: ExtractorEntry[] = [
    { pattern: PACKAGE_JSON_PATTERN, extractor: packageJsonExtractor },
    { pattern: PNPM_WORKSPACE_PATTERN, extractor: pnpmWorkspaceYamlExtractor },
  ]

  useHoverProviders(entries)
  useCompletionProviders(entries)
  useCodeActionProviders(entries)

  registerDiagnosticCollection({
    [PACKAGE_JSON_BASENAME]: packageJsonExtractor,
    [PNPM_WORKSPACE_BASENAME]: pnpmWorkspaceYamlExtractor,
  })

  useCommands({
    [commands.openInBrowser]: openInBrowser,
    [commands.openFileInNpmx]: openFileInNpmx,
  })
})
