import {
  NPMX_DEV,
  PACKAGE_JSON_BASENAME,
  PACKAGE_JSON_PATTERN,
  PNPM_WORKSPACE_BASENAME,
  PNPM_WORKSPACE_PATTERN,
  VERSION_TRIGGER_CHARACTERS,
} from '#constants'
import { defineExtension, useCommands, watchEffect } from 'reactive-vscode'
import { Disposable, env, languages, Uri } from 'vscode'
import { openFileInNpmx } from './commands/open-file-in-npmx'
import { PackageJsonExtractor } from './extractors/package-json'
import { PnpmWorkspaceYamlExtractor } from './extractors/pnpm-workspace-yaml'
import { commands, displayName, version } from './generated-meta'
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

  registerDiagnosticCollection({
    [PACKAGE_JSON_BASENAME]: packageJsonExtractor,
    [PNPM_WORKSPACE_BASENAME]: pnpmWorkspaceYamlExtractor,
  })

  useCommands({
    [commands.openInBrowser]: () => {
      env.openExternal(Uri.parse(NPMX_DEV))
    },
    [commands.openFileInNpmx]: openFileInNpmx,
  })
})
