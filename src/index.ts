import {
  PACKAGE_JSON_BASENAME,
  PACKAGE_JSON_PATTERN,
  PNPM_WORKSPACE_BASENAME,
  PNPM_WORKSPACE_PATTERN,
  VERSION_TRIGGER_CHARACTERS,
} from '#constants'
import { defineExtension } from 'reactive-vscode'
import { languages } from 'vscode'
import { JsonExtractor } from './extractors/json'
import { YamlExtractor } from './extractors/yaml'
import { displayName, version } from './generated-meta'
import { VersionCompletionItemProvider } from './providers/completion-item/version'
import { registerDiagnosticCollection } from './providers/diagnostics'
import { NpmxDocumentLinkProvider } from './providers/document-link/npmx'
import { config, logger } from './state'

export const { activate, deactivate } = defineExtension((ctx) => {
  logger.info(`${displayName} Activated, v${version}`)

  const jsonExtractor = new JsonExtractor()
  const yamlExtractor = new YamlExtractor()

  ctx.subscriptions.push(
    languages.registerDocumentLinkProvider(
      { pattern: PACKAGE_JSON_PATTERN },
      new NpmxDocumentLinkProvider(jsonExtractor),
    ),
    languages.registerDocumentLinkProvider(
      { pattern: PNPM_WORKSPACE_PATTERN },
      new NpmxDocumentLinkProvider(yamlExtractor),
    ),
  )

  if (config.versionCompletion !== 'off') {
    ctx.subscriptions.push(
      languages.registerCompletionItemProvider(
        { pattern: PACKAGE_JSON_PATTERN },
        new VersionCompletionItemProvider(jsonExtractor),
        ...VERSION_TRIGGER_CHARACTERS,
      ),
      languages.registerCompletionItemProvider(
        { pattern: PNPM_WORKSPACE_PATTERN },
        new VersionCompletionItemProvider(yamlExtractor),
        ...VERSION_TRIGGER_CHARACTERS,
      ),
    )
  }

  registerDiagnosticCollection({
    [PACKAGE_JSON_BASENAME]: jsonExtractor,
    [PNPM_WORKSPACE_BASENAME]: yamlExtractor,
  })
})
