import type { ResolvedDependencyInfo } from '#types/context'
import type { PackageInfo } from '#utils/api/package'
import { describe, expect, it } from 'vitest'
import { resolveUpgrade } from '../../src/providers/diagnostics/rules/upgrade'
import { createContext } from './context'

const distTags: Record<string, string> = {
  latest: '2.7.0',
  next: '3.0.0-alpha.5',
}

const versionsMeta: Record<string, object> = {
  '1.0.0': {},
  '2.7.0': {},
  '3.0.0-alpha.1': {},
  '3.0.0-alpha.5': {},
}

async function createOptions(version: string): Promise<[ResolvedDependencyInfo, PackageInfo, string]> {
  const ctx = createContext({ name: 'vite', version, distTags, versionsMeta })
  return [ctx.dep, ctx.pkg, (await ctx.dep.resolvedVersion())!]
}

describe('resolveUpgrade', () => {
  it('should flag when latest is greater than current version', async () => {
    expect(resolveUpgrade(...await createOptions('^1.0.0'))).toBe('^2.7.0')
  })

  it.each([
    '^2.7.0',
    'latest',
    'npm:latest',
    '3.0.0-alpha.5',
  ])('should not flag for "%s"', async (version) => {
    const options = await createOptions(version)
    if (!options) {
      return
    }
    expect(resolveUpgrade(...options)).toBeUndefined()
  })

  it('should flag prerelease upgrade within same pre-id', async () => {
    expect(resolveUpgrade(...await createOptions('3.0.0-alpha.1'))).toBe('3.0.0-alpha.5')
  })

  it('should not flag when target upgrade version is ignored', async () => {
    expect(resolveUpgrade(...await createOptions('^1.0.0'), ['vite@^2.7.0'])).toBeUndefined()
  })

  it('should preserve protocol prefix in targetVersion', async () => {
    expect(resolveUpgrade(...await createOptions('npm:foo@^1.0.0'))).toBe('npm:foo@^2.7.0')
  })
})
