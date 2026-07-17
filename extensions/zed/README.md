# npmx for Zed

Enhance your npm package workflow in Zed.

This extension runs the `npmx-language-server` — the same language server used by the VS Code version — over stdio. The server version is pinned to the extension version and auto-installed from npm when needed.

## Features

- Hover links to package pages and docs on [npmx.dev](https://npmx.dev)
- Emoji hover icons for non-VS Code editors
- Version completion with provenance and prerelease settings
- Diagnostics for upgrades, deprecations, replacements, vulnerabilities, dist tags, and engine mismatches
- Document links for package names
- Workspace-aware dependency resolution for npm, pnpm, yarn, and bun projects

## Settings

Settings under `lsp.npmx.settings` are forwarded to the language server as `npmx` workspace configuration. Use scoped npmx settings without the leading `npmx.` prefix:

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

To override the language server command (e.g. for local development):

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

## Local Development

1. Build the language server from the repo root with `pnpm build`.
2. Configure `lsp.npmx.binary` in Zed settings pointing to the local build (see above).
3. Install `extensions/zed` as a dev extension in Zed.

## Publishing

1. Bump version in `Cargo.toml`, `extension.toml`, and `packages/language-server/package.json`.
2. Build the monorepo and publish `npmx-language-server` to npm.
3. Open a PR to [zed-industries/extensions](https://github.com/zed-industries/extensions) updating the submodule and version.

## Notes

- Zed dev extensions require Rust installed via `rustup`; the Zed docs explicitly call out that Homebrew Rust will not work for dev extension compilation.
- The language server version is pinned to the extension's `Cargo.toml` version. It auto-installs via the Zed npm API when the extension activates.
