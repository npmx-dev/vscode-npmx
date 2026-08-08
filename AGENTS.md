# AGENTS.md

## Commands (pnpm, run from root)
- `pnpm dev` — start dev server (all packages)
- `pnpm build` — production build (all packages)
- `pnpm lint:fix` — auto-fix lint issues (ESLint via `@vida0905/eslint-config`)
- `pnpm typecheck` — type check with `tsgo`
- `pnpm test` — run all tests (Vitest)
- `pnpm vitest run path/to/file.test.ts` — run a single test file

## Architecture
Monorepo (pnpm workspaces) for VS Code extension around [npmx.dev](https://npmx.dev). Uses `reactive-vscode` for reactivity, `tsdown` for bundling, Volar for language server. Tests are colocated (`.test.ts` next to source).

### Workspaces
- `extensions/vscode/` — thin client (language client, commands, providers). Commands in `src/commands/` must NOT import `reactive-vscode`; use `vscode` API directly.
- `packages/shared` — constants, types, LSP protocol definitions
- `packages/language-core` — extractors, API clients, workspace context
- `packages/language-service` — Volar plugins (hover, completion, diagnostics, document-link, catalog)
- `packages/language-server` — Volar server

### Key abstractions
- **Extractor** — parses package files into dependency AST data
- **WorkspaceContext** — per-folder state (package manager, catalogs, deps)
- **Plugin** — Volar language service plugin consuming resolved deps

## Code Style
- ESM, strict TypeScript — never use `any` or type-cast with `as`; validate rather than assert
- Imports: type imports first, then `#` aliases (`#state`, `#utils/`, `#core/`), then external packages, then relative — no blank lines between groups
- No `node:` built-in imports in `src/` (browser-compat constraint)
- Naming: files/folders `kebab-case`, tests `*.test.ts`, functions `camelCase`, constants `SCREAMING_SNAKE_CASE`, types `PascalCase`
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): description` (lowercase subject)
