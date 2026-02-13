<p align="center">
  <img src="https://github.com/npmx-dev/vscode-npmx/blob/main/res/logo.png?raw=true" height="150">
</p>

<h1 align="center">npmx <sup>VS Code</sup></h1>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=npmx-dev.vscode-npmx">
    <img src="https://img.shields.io/visual-studio-marketplace/v/npmx-dev.vscode-npmx?color=blue&label=VS%20Code%20Marketplace" alt="VS Code Marketplace">
  </a>
  <a href="https://kermanx.github.io/reactive-vscode/" target="__blank"><img src="https://img.shields.io/badge/made_with-reactive--vscode-%23007ACC?style=flat&labelColor=%23229863"  alt="Made with reactive-vscode" /></a>
</p>

> [!NOTE]
> 🚧 **Preview Version** - This extension is under active development. Some features and configurations may change.

## Features

- **Hover Information** &ndash; Quick links to package details and documentation on [npmx.dev](https://npmx.dev), with provenance verification status.
- **Version Completion** &ndash; Autocomplete package versions with provenance filtering and prerelease exclusion support.
- **Diagnostics**
  - Deprecated package warnings with deprecation messages
  - Package replacement suggestions (via [module-replacements](https://github.com/es-tooling/module-replacements))
  - Vulnerability detection powered by the [OSV](https://osv.dev/) database, with severity levels (critical, high, moderate, low)
  - Upgrade hints when a newer version is available, with quick-fix code actions
- **Commands**
  - Open [npmx.dev](https://npmx.dev) in external browser
  - Open `node_modules` files on [npmx.dev](https://npmx.dev) code viewer with syntax highlighting (from editor title, context menu, or command palette)

## Supported Files

- `package.json`
- `pnpm-workspace.yaml`

## Configuration

<!-- configs -->

| Key                                 | Description                                                                             | Type      | Default             |
| ----------------------------------- | --------------------------------------------------------------------------------------- | --------- | ------------------- |
| `npmx.hover.enabled`                | Enable hover information for packages                                                   | `boolean` | `true`              |
| `npmx.completion.version`           | Version completion behavior                                                             | `string`  | `"provenance-only"` |
| `npmx.completion.excludePrerelease` | Exclude prerelease versions (alpha, beta, rc, canary, etc.) from completion suggestions | `boolean` | `true`              |
| `npmx.diagnostics.upgrade`          | Show hints when a newer version of a package is available                               | `boolean` | `true`              |
| `npmx.diagnostics.deprecation`      | Show warnings for deprecated packages                                                   | `boolean` | `true`              |
| `npmx.diagnostics.replacement`      | Show suggestions for package replacements                                               | `boolean` | `true`              |
| `npmx.diagnostics.vulnerability`    | Show warnings for packages with known vulnerabilities                                   | `boolean` | `true`              |
| `npmx.versionLens.enabled`          | Show version lens (CodeLens) for package dependencies                                   | `boolean` | `true`              |

<!-- configs -->

## Related

- [npmx.dev](https://npmx.dev) &ndash; A fast, modern browser for the npm registry
- [npmx-replace-extension](https://github.com/tylersayshi/npmx-replace-extension) &ndash; Browser extension to redirect npmjs.com to npmx.dev

## Contributing

Contributions are welcome! Please review our [contribution guide](./CONTRIBUTING.md) for more details.

## License

[MIT](./LICENSE) License &copy; 2026-PRESENT [Vida Xie](https://github.com/9romise)
