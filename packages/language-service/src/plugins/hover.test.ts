import type { PackageInfo } from 'npmx-language-core/api/package'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import { describe, expect, it } from 'vitest'
import { renderHoverMarkdown } from './hover'

const packageInfo = {
  name: 'lodash',
  distTags: {
    latest: '1.0.0',
  },
  versionsMeta: {
    '1.0.0': {
      provenance: true,
      trustedPublisher: true,
      staged: true,
    },
  },
  timeCreated: '2026-01-01T00:00:00.000Z',
  timeModified: '2026-01-01T00:00:00.000Z',
  lastSynced: 0,
  specifier: 'lodash',
  versionToTag: new Map([['1.0.0', 'latest']]),
} satisfies PackageInfo

function createDependency(overrides: Partial<DependencyInfo> = {}): DependencyInfo {
  return {
    category: 'dependencies',
    rawName: 'lodash',
    rawSpec: '^1.0.0',
    nameRange: [0, 0],
    specRange: [0, 0],
    protocol: 'npm',
    resolvedName: 'lodash',
    resolvedSpec: '^1.0.0',
    resolvedProtocol: 'npm',
    packageInfo: async () => packageInfo,
    resolvedVersion: async () => '1.0.0',
    ...overrides,
  }
}

describe('renderHoverMarkdown', () => {
  it('renders codicon markup for codicon-capable clients', async () => {
    await expect(renderHoverMarkdown(createDependency(), 'codicon')).resolves.toMatchInlineSnapshot(`
      "[$(verified)&nbsp;Verified provenance](https://npmx.dev/package/lodash/v/^1.0.0#provenance) · $(workspace-trusted)&nbsp;Trusted publisher · $(session-in-progress)&nbsp;Staged

      [$(package)&nbsp;View on npmx.dev](https://npmx.dev/package/lodash) | [$(book)&nbsp;View docs on npmx.dev](https://npmx.dev/docs/lodash/v/^1.0.0)"
    `)
  })

  it('renders emoji icons for non-codicon clients', async () => {
    await expect(renderHoverMarkdown(createDependency(), 'emoji')).resolves.toMatchInlineSnapshot(`
      "[✅ Verified provenance](https://npmx.dev/package/lodash/v/^1.0.0#provenance) · 🔑 Trusted publisher · 🚧 Staged

      [📦 View on npmx.dev](https://npmx.dev/package/lodash) | [📖 View docs on npmx.dev](https://npmx.dev/docs/lodash/v/^1.0.0)"
    `)
  })

  it('renders emoji icons for non-npm packages with emoji style', async () => {
    await expect(renderHoverMarkdown(createDependency({
      protocol: 'jsr',
      resolvedName: '@std/fs',
      resolvedSpec: '^1.0.0',
      resolvedProtocol: 'jsr',
    }), 'emoji')).resolves.toMatchInlineSnapshot('"[📦 View on jsr.io](https://jsr.io/@std/fs) | ⚠️ Not on npmx.dev"')
  })
})
