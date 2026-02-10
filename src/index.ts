import type { Range, Uri } from 'vscode'
import {
  PACKAGE_JSON_BASENAME,
  PACKAGE_JSON_PATTERN,
  PNPM_WORKSPACE_BASENAME,
  PNPM_WORKSPACE_PATTERN,
  VERSION_TRIGGER_CHARACTERS,
} from '#constants'
import { debounce } from 'perfect-debounce'
import { defineExtension, useCommands, watchEffect } from 'reactive-vscode'
import { CodeActionKind, Disposable, languages, commands as vscodeCommands, workspace, WorkspaceEdit } from 'vscode'
import { openFileInNpmx } from './commands/open-file-in-npmx'
import { openInBrowser } from './commands/open-in-browser'
import { PackageJsonExtractor } from './extractors/package-json'
import { PnpmWorkspaceYamlExtractor } from './extractors/pnpm-workspace-yaml'
import { commands, displayName, version } from './generated-meta'
import { UpgradeProvider } from './providers/code-actions/upgrade'
import { VersionCodeLensProvider } from './providers/code-lens/version'
import { VersionCompletionItemProvider } from './providers/completion-item/version'
import { registerDiagnosticCollection } from './providers/diagnostics'
import { NpmxHoverProvider } from './providers/hover/npmx'
import { config, logger } from './state'

export const { activate, deactivate } = defineExtension(() => {
  logger.info(`${displayName} Activated, v${version}`)

  const packageJsonExtractor = new PackageJsonExtractor()
  const pnpmWorkspaceYamlExtractor = new PnpmWorkspaceYamlExtractor()

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

  watchEffect((onCleanup) => {
    if (!config.versionLens.enabled)
      return

    const disposables = [
      languages.registerCodeLensProvider(
        { pattern: PACKAGE_JSON_PATTERN },
        new VersionCodeLensProvider(packageJsonExtractor),
      ),
      languages.registerCodeLensProvider(
        { pattern: PNPM_WORKSPACE_PATTERN },
        new VersionCodeLensProvider(pnpmWorkspaceYamlExtractor),
      ),
    ]

    onCleanup(() => Disposable.from(...disposables).dispose())
  })

  registerDiagnosticCollection({
    [PACKAGE_JSON_BASENAME]: packageJsonExtractor,
    [PNPM_WORKSPACE_BASENAME]: pnpmWorkspaceYamlExtractor,
  })

  useCommands({
    [commands.openInBrowser]: openInBrowser,
    [commands.openFileInNpmx]: openFileInNpmx,
    [commands.updateVersion]: debounce(async (uri: Uri, range: Range, newVersion: string) => {
      const edit = new WorkspaceEdit()
      edit.replace(uri, range, newVersion)
      await workspace.applyEdit(edit)
      vscodeCommands.executeCommand('editor.action.codeLens.refresh')
    }, 300, { leading: true, trailing: false }),
  })
})
