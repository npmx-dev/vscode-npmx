# npmx for Zed

This is the in-repo Zed extension for `npmx`. It runs the shared `npmx-language-server`
over stdio, so Zed gets the same core package intelligence used by the VS Code extension.

## Status

- Uses the shared `npmx-language-server`
- Targets local development from this monorepo first
- Defaults to `packages/language-server/dist/index.cjs`
- Launches the language server over `--stdio`
- Supports overriding the launched command through Zed `lsp.npmx.binary` settings
- Forwards `lsp.npmx.settings` to the language server as `npmx` workspace configuration

## Features

- Hover links to package pages and docs on [npmx.dev](https://npmx.dev)
- Emoji hover icons for non-VS Code editors
- Version completion with provenance and prerelease settings
- Diagnostics for upgrades, deprecations, replacements, vulnerabilities, dist tags, and engine mismatches
- Document links for package names
- Workspace-aware dependency resolution for npm, pnpm, yarn, and bun projects

## Local Development

1. Build the language server from the repo root with `pnpm build`.
2. In Zed, install `extensions/zed` as a dev extension.
3. If you want a custom launch command, configure `lsp.npmx.binary` in your Zed settings.

## Settings

Zed settings under `lsp.npmx.settings` are forwarded directly to the language server.
Use scoped npmx settings without the leading `npmx.` prefix:

```json
{
  "lsp": {
    "npmx": {
      "settings": {
        "hover": {
          "enabled": true
        },
        "completion": {
          "version": "provenance-only",
          "excludePrerelease": true
        },
        "diagnostics": {
          "upgrade": true,
          "deprecation": true,
          "replacement": true,
          "vulnerability": true,
          "distTag": true,
          "engineMismatch": true
        },
        "packageLinks": "declared"
      }
    }
  }
}
```

To override the launched language server command:

```json
{
  "lsp": {
    "npmx": {
      "binary": {
        "path": "node",
        "arguments": [
          "/absolute/path/to/vscode-npmx/packages/language-server/dist/index.cjs",
          "--stdio"
        ]
      }
    }
  }
}
```

## Notes

- Zed dev extensions require Rust installed via `rustup`; the Zed docs explicitly call out that Homebrew Rust will not work for dev extension compilation.
- This dev extension expects the repo-local language server bundle at `packages/language-server/dist/index.cjs`, so build the monorepo before installing it in Zed.
- If you override `lsp.npmx.binary`, make sure the launched server process still receives an LSP transport argument such as `--stdio`.
