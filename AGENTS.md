# AGENTS.md

## Commands (pnpm, run from root)
- `pnpm dev` / `pnpm build` — dev/build all packages
- `pnpm test` — run all tests (vitest, workspace projects under `extensions/*`)
- `pnpm test -- --run tests/path/to/file.test.ts` — run a single test file
- `pnpm lint:fix` — ESLint auto-fix (`@vida0905/eslint-config`)
- `pnpm typecheck` — type-check with `tsgo -b --noEmit`

## Architecture
- **Monorepo** (pnpm workspaces). Main extension: `extensions/vscode/` (VS Code extension using `reactive-vscode`). Shared code: `shared/` (constants, types, meta). Internal packages: `packages/language-core/`, `packages/language-service/`, `packages/language-server/` (bundled into the extension via tsdown, not standalone workspace packages).
- Extension entry: `extensions/vscode/src/index.ts`. Key dirs: `api/` (npm registry), `commands/`, `composables/`, `core/`, `providers/`, `utils/`.
- Tests live in `extensions/vscode/tests/` and `packages/*/tests/` using vitest + `jest-mock-vscode` + `msw` for HTTP mocking.

## Code Style
- **TypeScript strict mode**, ESNext target, Bundler resolution, ESM (`"type": "module"`).
- Use `interface` over `type`. Never use `any`. Avoid `as` casts—validate instead.
- No `node:` built-in imports in `src/` (browser-compatible). No `semver` default import—use subpath.
- No `reactive-vscode` composables in `src/commands/`—use `vscode` API directly.
- Minimal comments—only when truly necessary (prefix hacks with `// HACK:`).
- Conventional Commits: `type(scope): description` (lowercase subject).
- Bundler: tsdown. Package manager: pnpm (deps managed via catalogs in `pnpm-workspace.yaml`).
