# Contributing to vscode-npmx

Thank you for your interest in contributing! ❤️ This document provides guidelines and instructions for contributing.

> [!IMPORTANT]
> Please be respectful and constructive in all interactions. We aim to maintain a welcoming environment for all contributors.
> [👉 Read more](./CODE_OF_CONDUCT.md)

## Goals

The goal of [vscode-npmx](https://marketplace.visualstudio.com/items?itemName=npmx-dev.vscode-npmx) is to build a useful extension around [npmx.dev](https://npmx.dev), making it easier for developers to manage npm packages within VS Code.

## Table of Contents

- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
- [Development workflow](#development-workflow)
  - [Available commands](#available-commands)
  - [Project structure](#project-structure)
- [Code style](#code-style)
  - [TypeScript](#typescript)
  - [Import order](#import-order)
  - [Naming conventions](#naming-conventions)
- [Testing](#testing)
  - [Unit tests](#unit-tests)
- [Submitting changes](#submitting-changes)
  - [Before submitting](#before-submitting)
  - [Pull request process](#pull-request-process)
  - [Commit messages and PR titles](#commit-messages-and-pr-titles)
- [Pre-commit hooks](#pre-commit-hooks)
- [Using AI](#using-ai)
- [Questions](#questions)
- [License](#license)

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [pnpm](https://pnpm.io/) v10.28.1 or later

### Setup

1. fork and clone the repository
2. install dependencies:

   ```bash
   pnpm install
   ```

3. start the development server:

   ```bash
   pnpm dev
   ```

4. Press `F5` to open the VS Code debugger and start the extension in a new VS Code window.

## Development workflow

### Available commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Production build
pnpm package          # Save extension as vsix file to root

# Code Quality
pnpm lint             # Run linter (oxlint + oxfmt)
pnpm lint:fix         # Auto-fix lint issues
pnpm typecheck        # TypeScript type checking

# Testing
pnpm test             # Run tests
```

### Project structure

```
playground/             # Playground for testing
res/                    # Assets (e.g. marketplace icon)
src/                    # Extension source code
├── extractors/         # Extractors
├── providers/          # Providers
├── types/              # TypeScript types
├── utils/              # Utility functions
├── constants.ts        # Constants
├── state.ts            # State management
└── index.ts            # Extension entry point
tests/                  # Tests
```

## Code style

When committing changes, try to keep an eye out for unintended formatting updates. These can make a pull request look noisier than it really is and slow down the review process. Sometimes IDEs automatically reformat files on save, which can unintentionally introduce extra changes.

If you want to get ahead of any formatting issues, you can also run `pnpm lint:fix` before committing to fix formatting across the whole project.

### TypeScript

- We care about good types &ndash; never cast things to `any` 💪
- Validate rather than just assert

### Import order

1. Type imports first (`import type { ... }`)
2. Internal aliases (`#constants`, `#utils/`, etc.)
3. External packages (including `node:`)
4. Relative imports (`./`, `../`)
5. No blank lines between groups

```typescript
import type { PackageVersionsInfoWithMetadata } from 'fast-npm-meta'
import { logger } from '#state'
import { getVersions } from 'fast-npm-meta'
import { memoize } from '../memoize'
```

### Naming conventions

| Type             | Convention           | Example                                       |
| ---------------- | -------------------- | --------------------------------------------- |
| Files/Folders    | kebab-case           | `package-json.ts`, `pnpm-workspace-yaml.ts`   |
| Test files       | kebab-case + `.test` | `memoize.test.ts`                             |
| Functions        | camelCase            | `fetchPackage`, `formatDate`                  |
| Constants        | SCREAMING_SNAKE_CASE | `NPM_REGISTRY`, `ALLOWED_TAGS`                |
| Types/Interfaces | PascalCase           | `NpmSearchResponse`, `Extractor`, `ValidNode` |

## Testing

### Unit tests

Write unit tests for core functionality using Vitest:

```typescript
import { describe, expect, it } from 'vitest'

describe('featureName', () => {
  it('should handle expected case', () => {
    expect(result).toBe(expected)
  })
})
```

## Submitting changes

### Before submitting

1. ensure your code follows the style guidelines
2. run linting: `pnpm lint:fix`
3. run type checking: `pnpm typecheck`
4. run tests: `pnpm test`
5. write or update tests for your changes

### Pull request process

1. create a feature branch from `main`
2. make your changes with clear, descriptive commits
3. push your branch and open a pull request
4. ensure CI checks pass (lint, type check, tests)
5. request review from maintainers

### Commit messages and PR titles

Write clear, concise PR titles that explain the "why" behind changes.

We use [Conventional Commits](https://www.conventionalcommits.org/). Since we squash on merge, the PR title becomes the commit message in `main`, so it's important to get it right.

Format: `type(scope): description`

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Scopes (optional):** `docs`, `i18n`, `deps`

**Examples:**

- `fix: resolve search pagination issue`
- `feat: add package version comparison`
- `fix(i18n): update French translations`
- `chore(deps): update vite to v6`

> [!NOTE]
> The subject must start with a lowercase letter. Individual commit messages within your PR don't need to follow this format since they'll be squashed.

### PR descriptions

If your pull request directly addresses an open issue, use the following inside your PR description.

```text
Resolves | Fixes | Closes: #xxx
```

Replace `#xxx` with either a URL to the issue, or the number of the issue. For example:

```text
Fixes:#123
```

or

```text
Closes https://github.com/npmx-dev/vscode-npmx/issues/123
```

This provides the following benefits:

- it links the pull request to the issue (the merge icon will appear in the issue), so everybody can see there is an open PR
- when the pull request is merged, the linked issue is automatically closed

## Pre-commit hooks

The project uses `nano-staged` with `husky` to automatically lint files on commit.

## Using AI

You're welcome to use AI tools to help you contribute. But there are two important ground rules:

### 1. Never let an LLM speak for you

When you write a comment, issue, or PR description, use your own words. Grammar and spelling don't matter &ndash; real connection does. AI-generated summaries tend to be long-winded, dense, and often inaccurate. Simplicity is an art. The goal is not to sound impressive, but to communicate clearly.

### 2. Never let an LLM think for you

Feel free to use AI to write code, tests, or point you in the right direction. But always understand what it's written before contributing it. Take personal responsibility for your contributions. Don't say "ChatGPT says..." &ndash; tell us what _you_ think.

For more context, see [Using AI in open source](https://roe.dev/blog/using-ai-in-open-source).

## Questions?

If you have questions or need help, feel free to open an issue for discussion or join our [Discord server](https://chat.npmx.dev).

## License

By contributing to vscode-npmx, you agree that your contributions will be licensed under the [MIT License](LICENSE).
