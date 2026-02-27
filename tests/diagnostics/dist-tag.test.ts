import type { DependencyInfo } from '#types/extractor'
import type { PackageInfo } from '#utils/api/package'
import type { DiagnosticContext } from '../../src/providers/diagnostics'
import { parseVersion } from '#utils/version'
import { describe, expect, it } from 'vitest'
import { checkDistTag } from '../../src/providers/diagnostics/rules/dist-tag'

function createContext(name: string, version: string, distTags: Record<string, string>): DiagnosticContext {
  const dep: DependencyInfo = { name, version, nameNode: {}, versionNode: {} }
  const pkg = { distTags } as PackageInfo
  return { dep, pkg, parsed: parseVersion(version), exactVersion: null }
}

describe('checkDistTag', () => {
  it('should flag when version matches a dist tag in metadata', async () => {
    const ctx = createContext('lodash', 'latest', { latest: '2.0.0' })
    const result = await checkDistTag(ctx)

    expect(result).toBeDefined()
  })

  it('should not flag when version does not match any dist tag in metadata', async () => {
    const ctx = createContext('lodash', 'next', { latest: '2.0.0' })
    const result = await checkDistTag(ctx)

    expect(result).toBeUndefined()
  })
})
