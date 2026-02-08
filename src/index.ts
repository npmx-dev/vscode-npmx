import {
  NPMX_DEV,
  PACKAGE_JSON_BASENAME,
  PACKAGE_JSON_PATTERN,
  PNPM_WORKSPACE_BASENAME,
  PNPM_WORKSPACE_PATTERN,
  VERSION_TRIGGER_CHARACTERS,
} from '#constants'
import { defineExtension, useActiveTextEditor, useCommands, watchEffect } from 'reactive-vscode'
import { Disposable, env, languages, Uri, window } from 'vscode'
import { PackageJsonExtractor } from './extractors/package-json'
import { PnpmWorkspaceYamlExtractor } from './extractors/pnpm-workspace-yaml'
import { commands, displayName, version } from './generated-meta'
import { VersionCompletionItemProvider } from './providers/completion-item/version'
import { registerDiagnosticCollection } from './providers/diagnostics'
import { NpmxHoverProvider } from './providers/hover/npmx'
import { config, logger } from './state'
import { npmxFileUrl } from './utils/links'
import { resolvePackageRelativePath } from './utils/resolve'

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

  const textEditor = useActiveTextEditor()
  useCommands({
    [commands.openInBrowser]: () => {
      env.openExternal(Uri.parse(NPMX_DEV))
    },

    [commands.openFileInNpmx]: async (fileUri?: Uri) => {
      // If triggered from context menu, fileUri is provided.
      // If triggered from command palette, use active text editor.
      const uri = fileUri || textEditor.value?.document.uri
      if (!uri) {
        window.showErrorMessage('npmx: No active file selected.')
        return
      }

      // Assert the given file is in `node_modules/`, though the command should
      // already be limited to such files.
      if (!uri.path.includes('/node_modules/')) {
        window.showErrorMessage('npmx: Selected file is not within a node_modules folder.')
        return
      }

      // Find the associated package manifest and the relative path to the given file.
      const result = await resolvePackageRelativePath(uri)
      if (!result) {
        logger.warn(`Could not resolve npmx url: ${uri.toString()}`)
        window.showWarningMessage(`npmx: Could not find package.json for ${uri.toString()}`)
        return
      }
      const [manifest, relativePath] = result

      // Use line number only if the user is actively looking at the relevant file
      const openingActiveFile = !fileUri || fileUri.toString() === textEditor.value?.document.uri.toString()

      // VSCode uses 0-indexed lines, npmx uses 1-indexed lines
      const vsCodeLine = openingActiveFile ? textEditor.value?.selection.active.line : undefined
      const npmxLine = vsCodeLine !== undefined ? vsCodeLine + 1 : undefined

      // Construct the npmx.dev URL and open it.
      const url = npmxFileUrl(manifest.name, manifest.version, relativePath, npmxLine)
      await env.openExternal(Uri.parse(url))
    },
  })
})
