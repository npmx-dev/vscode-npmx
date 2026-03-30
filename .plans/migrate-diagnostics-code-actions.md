# Migrate Diagnostics & Code Actions to Language Service Plugins

## Overview

Move diagnostics and code actions from the VS Code extension (`extensions/vscode/src/providers/`) to the language service (`packages/language-service/src/plugins/`), following the same Volar plugin pattern as the existing hover plugin.

## Current State

- **Diagnostics**: `extensions/vscode/src/providers/diagnostics/` — reactive-vscode watchers, VS Code `DiagnosticCollection`, 6 rules
- **Code Actions**: `extensions/vscode/src/providers/code-actions/quick-fix.ts` — VS Code `CodeActionProvider`, regex-parses diagnostic messages
- **Rules**: upgrade, deprecation, dist-tag, engine-mismatch, replacement, vulnerability

## Dependency Graph

```
code-actions plugin ──reads──▶ context.diagnostics
                               ├── upgrade (specRange, config.ignore.upgrade)
                               ├── vulnerability (specRange, config.ignore.vulnerability)
                               ├── deprecation (specRange, config.ignore.deprecation)
                               ├── replacement (nameRange, config.ignore.replacement)
                               ├── dist-tag (specRange)
                               └── engine-mismatch (specRange, workspaceContext.engines)
```

Code actions **depend on diagnostic codes and message formats** — they must stay in sync.

## Type Mapping (VS Code → LSP)

| VS Code API | LSP Equivalent (`vscode-languageserver-protocol`) |
|---|---|
| `vscode.DiagnosticSeverity` | `DiagnosticSeverity` |
| `vscode.DiagnosticTag` | `DiagnosticTag` |
| `vscode.Uri.parse(url)` | `string` (use raw URL string) |
| `diagnostic.code.target` | `diagnostic.codeDescription.href` |
| `vscode.CodeAction` | `CodeAction` |
| `vscode.WorkspaceEdit` | `WorkspaceEdit` |
| `vscode.CodeActionKind.QuickFix` | `CodeActionKind.QuickFix` |
| `vscode.ConfigurationTarget` | command argument (string `"workspace"` / `"global"`) |

## Steps

### 1. Move `formatUpgradeVersion` to language-service

- **From**: `extensions/vscode/src/utils/version.ts`
- **To**: `packages/language-service/src/utils/version.ts`
- Pure logic, no vscode deps. Re-export or update imports in extension side.
- Move `extensions/vscode/src/utils/version.test.ts` alongside → `packages/language-service/src/utils/version.test.ts`

### 2. Create `packages/language-service/src/plugins/diagnostics.ts`

Single plugin providing both `provideDiagnostics` and `provideCodeActions` — they're tightly coupled (code actions parse diagnostic messages/codes), so co-locating them avoids sync issues.

**Diagnostics side:**
- Implement `provideDiagnostics(document, token)`
- Define `DiagnosticRule` type using LSP types
- Port all 6 rules as functions within the file (they're small)
- Use `getConfig(context, 'npmx.diagnostics.*')` for per-rule enablement
- Use `getConfig(context, 'npmx.ignore.*')` instead of `#state` config
- Use `workspaceState.getWorkspaceContext()` for engine-mismatch (already on `IWorkspaceState`)
- **Scope rules:**
  - Most rules: use `isDependencyFile` (matches `package.json`, `pnpm-workspace.yaml`, `.yarnrc.yml`)
  - `engine-mismatch`: use `isPackageManifest` (matches any `package.json` — needed to exclude workspace config files like `pnpm-workspace.yaml`)

**Code actions side:**
- Implement `provideCodeActions(document, range, context, token)`
- Port regex-based strategy pattern from `quick-fix.ts`
- Quick fix edits → LSP `TextEdit` in `WorkspaceEdit`
- Ignore actions → `CodeAction` with `command` field (command name + args)
  - Command name: `npmx.addToIgnore` (handled by VS Code client side)
  - Args: `[code, packageId, "workspace" | "global"]` (use strings instead of `ConfigurationTarget` enum)

> **Note:** LSP pull-model `provideDiagnostics` requires returning all diagnostics at once, losing the current progressive/streaming behavior (fire-and-forget per dep). All diagnostics will block until the slowest package resolves. This latency tradeoff is acceptable for now.

**Capabilities:**
```ts
capabilities: {
  diagnosticProvider: { interFileDependencies: false, workspaceDiagnostics: false },
  codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] },
}
```

### 3. Register plugin in `packages/language-service/src/index.ts`

```ts
import { create as createDiagnosticsPlugin } from './plugins/diagnostics'

export function createNpmxLanguageServicePlugins(workspace: IWorkspaceState): LanguageServicePlugin[] {
  return [
    createNpmxHoverService(workspace),
    createDiagnosticsPlugin(workspace),
  ]
}
```

### 4. Handle commands on VS Code client side

- Re-register `npmx.addToIgnore` command in `extensions/vscode/src/index.ts` (currently registered inside `useCodeActions()` which will be deleted)
- Update `add-to-ignore.ts` to accept string target (`"workspace" | "global"`) and map to `ConfigurationTarget` enum:
  ```ts
  const targetMap: Record<string, ConfigurationTarget> = {
    workspace: ConfigurationTarget.Workspace,
    global: ConfigurationTarget.Global,
  }
  ```
- The language server sends `workspace/executeCommand` → client handles `addToIgnore`

### 5. Clean up extension side

- Delete `extensions/vscode/src/providers/diagnostics/` directory
- Delete `extensions/vscode/src/providers/code-actions/` directory
- Remove `useDiagnostics()` and `useCodeActions()` calls from extension entry
- Keep `add-to-ignore.ts` command (still needed for LSP command handling)
- Update extension entry to remove unused imports

### 6. Move/adapt tests

- Diagnostic rule tests: adapt to use LSP types instead of `vscode` mock types
- Quick fix tests: adapt to use LSP `CodeAction` / `Diagnostic` types
- Test utility `createContext` needs updating (remove `Uri.file`, use string URIs)
