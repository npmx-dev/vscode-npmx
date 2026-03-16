<p align="center">
  <img src="https://github.com/npmx-dev/vscode-npmx/blob/main/res/logo.png?raw=true" alt="npmx" height="150">
</p>

<h1 align="center">npmx Extensions</h1>

> [!NOTE]
> 🚧 **Preview Version** - These extensions are under active development. Some features and configurations may change.

## Packages

| Package | Description |
| ------- | ----------- |
| [`extensions/vscode`](./extensions/vscode) | [VS Code extension](https://marketplace.visualstudio.com/items?itemName=npmx-dev.vscode-npmx) for npmx |

## Features

- **Hover Information** &ndash; Quick links to package details and documentation on [npmx.dev](https://npmx.dev), with provenance verification status.
- **Version Completion** &ndash; Autocomplete package versions with provenance filtering and prerelease exclusion support.
- **Workspace-Aware Resolution** &ndash; Dependencies in `package.json`, `pnpm-workspace.yaml`, and `.yarnrc.yml` are resolved from a shared workspace context, including catalogs and workspace references.
- **Diagnostics**
  - Deprecated package warnings with deprecation messages
  - Package replacement suggestions (via [module-replacements](https://github.com/es-tooling/module-replacements))
  - Vulnerability detection powered by the [OSV](https://osv.dev/) database, with severity levels (critical, high, moderate, low)
  - Dist tag warnings when a dependency uses a mutable version tag instead of a pinned version
  - Engine mismatch warnings when dependency engine requirements conflict with the current package
  - Upgrade hints when a newer version is available
- **Catalog Resolution** &ndash; Inline decoration showing the resolved version spec for catalog dependencies in `package.json`.
- **Code Actions**
  - Quick fix actions for diagnostics with ignore list support (workspace or user settings)
- **Commands**
  - Open [npmx.dev](https://npmx.dev) in external browser
  - Open `node_modules` files on [npmx.dev](https://npmx.dev) code viewer with syntax highlighting (from editor title, editor context menu, explorer context menu, or command palette)

## Related

- [npmx.dev](https://npmx.dev) &ndash; A fast, modern browser for the npm registry
- [npmx-replace-extension](https://github.com/tylersayshi/npmx-replace-extension) &ndash; Browser extension to redirect npmjs.com to npmx.dev

## Contributing

Contributions are welcome! Please review our [contribution guide](./CONTRIBUTING.md) for more details.

## License

[MIT](./LICENSE) License &copy; 2026-PRESENT [Vida Xie](https://github.com/9romise)
