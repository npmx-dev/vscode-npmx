# npmx for Zed

This is the in-repo Zed port of the `npmx` VS Code extension.

Current status:

- Uses the shared `npmx-language-server`
- Targets local development from this monorepo first
- Defaults to `packages/language-server/dist/index.cjs`
- Launches the language server over `--stdio`
- Supports overriding the launched command through Zed `lsp.npmx.binary` settings

For local development:

1. Build the language server from the repo root with `pnpm build`.
2. In Zed, install `extensions/zed` as a dev extension.
3. If you want a custom launch command, configure `lsp.npmx.binary` in your Zed settings.

Notes:

- Zed dev extensions require Rust installed via `rustup`; the Zed docs explicitly call out that Homebrew Rust will not work for dev extension compilation.
- This dev extension expects the repo-local language server bundle at `packages/language-server/dist/index.cjs`, so build the monorepo before installing it in Zed.
- If you override `lsp.npmx.binary`, make sure the launched server process still receives an LSP transport argument such as `--stdio`.
