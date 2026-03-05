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
  - Dist tag warnings when a dependency uses a mutable version tag instead of a pinned version
  - Engine mismatch warnings when dependency engine requirements conflict with the current package
  - Upgrade hints when a newer version is available
- **Commands**
  - Open [npmx.dev](https://npmx.dev) in external browser
  - Open `node_modules` files on [npmx.dev](https://npmx.dev) code viewer with syntax highlighting (from editor title, explorer context menu, or command palette)

## Supported Files

- `package.json`
- `pnpm-workspace.yaml`
- `.yarnrc.yml`

## Configuration

<!-- configs -->

| Key                                 | Description                                                                                                                                                | Type      | Default             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------- |
| `npmx.hover.enabled`                | Enable hover information for packages                                                                                                                      | `boolean` | `true`              |
| `npmx.completion.version`           | Version completion behavior                                                                                                                                | `string`  | `"provenance-only"` |
| `npmx.completion.excludePrerelease` | Exclude prerelease versions (alpha, beta, rc, canary, etc.) from completion suggestions                                                                    | `boolean` | `true`              |
| `npmx.diagnostics.upgrade`          | Show hints when a newer version of a package is available                                                                                                  | `boolean` | `true`              |
| `npmx.diagnostics.deprecation`      | Show warnings for deprecated packages                                                                                                                      | `boolean` | `true`              |
| `npmx.diagnostics.replacement`      | Show suggestions for package replacements                                                                                                                  | `boolean` | `true`              |
| `npmx.diagnostics.vulnerability`    | Show warnings for packages with known vulnerabilities                                                                                                      | `boolean` | `true`              |
| `npmx.diagnostics.distTag`          | Show warnings when a dependency uses a dist tag                                                                                                            | `boolean` | `true`              |
| `npmx.diagnostics.engineMismatch`   | Show warnings when dependency engines mismatch with the current package                                                                                    | `boolean` | `true`              |
| `npmx.packageLinks`                 | Enable clickable links for package names                                                                                                                   | `string`  | `"declared"`        |
| `npmx.ignore.upgrade`               | Ignore list for upgrade diagnostics ("name" or "name@version"). See [Ignore Diagnostics](https://github.com/npmx-dev/vscode-npmx#ignore-diagnostics)       | `array`   | `[]`                |
| `npmx.ignore.deprecation`           | Ignore list for deprecation diagnostics ("name" or "name@version"). See [Ignore Diagnostics](https://github.com/npmx-dev/vscode-npmx#ignore-diagnostics)   | `array`   | `[]`                |
| `npmx.ignore.replacement`           | Ignore list for replacement diagnostics ("name" only). See [Ignore Diagnostics](https://github.com/npmx-dev/vscode-npmx#ignore-diagnostics)                | `array`   | `[]`                |
| `npmx.ignore.vulnerability`         | Ignore list for vulnerability diagnostics ("name" or "name@version"). See [Ignore Diagnostics](https://github.com/npmx-dev/vscode-npmx#ignore-diagnostics) | `array`   | `[]`                |

<!-- configs -->

## Ignore Diagnostics

`npmx` supports ignore lists for selected diagnostics.

Matching rules:

- `npmx.ignore.upgrade`, `npmx.ignore.deprecation`, and `npmx.ignore.vulnerability` support `name` and `name@version`.
- `npmx.ignore.replacement` supports `name` only.

When a diagnostic supports ignore actions, quick fixes can add entries directly:

- `Ignore ... (Workspace)` updates workspace settings.
- `Ignore ... (User)` updates user settings.

### Example

```json
{
  "npmx.ignore.upgrade": ["lodash", "@babel/core@7.0.0"],
  "npmx.ignore.deprecation": ["request"],
  "npmx.ignore.replacement": ["find-up"],
  "npmx.ignore.vulnerability": ["express@4.18.0"]
}
```

## Related

- [npmx.dev](https://npmx.dev) &ndash; A fast, modern browser for the npm registry
- [npmx-replace-extension](https://github.com/tylersayshi/npmx-replace-extension) &ndash; Browser extension to redirect npmjs.com to npmx.dev

## Contributing

Contributions are welcome! Please review our [contribution guide](./CONTRIBUTING.md) for more details.

## License

[MIT](./LICENSE) License &copy; 2026-PRESENT [Vida Xie](https://github.com/9romise)
