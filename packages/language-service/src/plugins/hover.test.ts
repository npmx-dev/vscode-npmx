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
  it('should use codicons when codicons are enabled', async () => {
    await expect(renderHoverMarkdown(createDependency(), true)).resolves.toMatchInlineSnapshot(`
      "[$(verified)&nbsp;Verified provenance](https://npmx.dev/package/lodash/v/^1.0.0#provenance)

      [$(package)&nbsp;View on npmx.dev](https://npmx.dev/package/lodash) | [$(book)&nbsp;View docs on npmx.dev](https://npmx.dev/docs/lodash/v/^1.0.0)"
    `)
  })

  it('should use unicode icons when markdown icons are disabled', async () => {
    await expect(renderHoverMarkdown(createDependency(), false)).resolves.toMatchInlineSnapshot(`
      "[✓ Verified provenance](https://npmx.dev/package/lodash/v/^1.0.0#provenance)

      [📦 View on npmx.dev](https://npmx.dev/package/lodash) | [📖 View docs on npmx.dev](https://npmx.dev/docs/lodash/v/^1.0.0)"
    `)
  })

  it('should use unicode icons for non-npm packages without markdown icons', async () => {
    await expect(renderHoverMarkdown(createDependency({
      protocol: 'jsr',
      resolvedName: '@std/fs',
      resolvedSpec: '^1.0.0',
      resolvedProtocol: 'jsr',
    }), false)).resolves.toMatchInlineSnapshot('"[📦 View on jsr.io](https://jsr.io/@std/fs) | ⚠ Not on npmx.dev"')
  })
})
