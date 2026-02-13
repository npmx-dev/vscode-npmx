import { extractorMapping } from '#composables/active-extractor'
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
import { commands, displayName, version } from './generated-meta'
import { UpgradeProvider } from './providers/code-actions/upgrade'
import { VersionCompletionItemProvider } from './providers/completion-item/version'
import { useDiagnostics } from './providers/diagnostics'
import { NpmxHoverProvider } from './providers/hover/npmx'
import { config, logger } from './state'

export const { activate, deactivate } = defineExtension(() => {
  logger.info(`${displayName} Activated, v${version}`)

  const packageJsonExtractor = extractorMapping[PACKAGE_JSON_BASENAME]
  const pnpmWorkspaceYamlExtractor = extractorMapping[PNPM_WORKSPACE_BASENAME]

  watchEffect((onCleanup) => {
    if (!config.hover.enabled)
      return

    const disposables = [
      languages.registerHoverProvider(
        { pattern: PACKAGE_JSON_PATTERN },
        new NpmxHoverProvider(packageJsonExtractor),
      ),
      languages.registerHoverProvider(
        { pattern: PNPM_WORKSPACE_PATTERN },
        new NpmxHoverProvider(pnpmWorkspaceYamlExtractor),
      ),
    ]

    onCleanup(() => Disposable.from(...disposables).dispose())
  })

  watchEffect((onCleanup) => {
    if (config.completion.version === 'off')
      return

    const disposables = [
      languages.registerCompletionItemProvider(
        { pattern: PACKAGE_JSON_PATTERN },
        new VersionCompletionItemProvider(packageJsonExtractor),
        ...VERSION_TRIGGER_CHARACTERS,
      ),
      languages.registerCompletionItemProvider(
        { pattern: PNPM_WORKSPACE_PATTERN },
        new VersionCompletionItemProvider(pnpmWorkspaceYamlExtractor),
        ...VERSION_TRIGGER_CHARACTERS,
      ),
    ]

    onCleanup(() => Disposable.from(...disposables).dispose())
  })

  watchEffect((onCleanup) => {
    if (!config.diagnostics.upgrade)
      return

    const provider = new UpgradeProvider()
    const options = { providedCodeActionKinds: [CodeActionKind.QuickFix] }
    const disposable = Disposable.from(
      languages.registerCodeActionsProvider({ pattern: PACKAGE_JSON_PATTERN }, provider, options),
      languages.registerCodeActionsProvider({ pattern: PNPM_WORKSPACE_PATTERN }, provider, options),
    )

    onCleanup(() => disposable.dispose())
  })

  useDiagnostics()

  useCommands({
    [commands.openInBrowser]: openInBrowser,
    [commands.openFileInNpmx]: openFileInNpmx,
  })
})
