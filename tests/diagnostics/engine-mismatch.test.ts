import type { Engines } from 'fast-npm-meta'
import { describe, expect, it } from 'vitest'
import { checkEngineMismatch } from '../../src/providers/diagnostics/rules/engine-mismatch'
import { createContext } from './context'

function createEngineMismatchContext(
  engines: Engines | undefined,
  dependencyEngines: Engines | undefined,
) {
  return createContext({
    name: 'foo',
    version: '^1.0.0',
    distTags: { latest: '1.0.0' },
    versionsMeta: {
      '1.0.0': dependencyEngines ? { engines: dependencyEngines } : {},
    },
    engines,
  })
}

describe('checkEngineMismatch', () => {
  it('should flag when engine ranges do not overlap', async () => {
    const ctx = createEngineMismatchContext(
      { node: '^18.0.0' },
      { node: '>=20' },
    )
    const result = await checkEngineMismatch(ctx)

    expect(result).toBeDefined()
    expect(result!.code).toMatchObject({ value: 'engine-mismatch' })
    expect(result!.message).toContain('requires ">=20", but package supports "^18.0.0"')
  })

  it('should flag when engine ranges overlap but are not fully compatible', async () => {
    const ctx = createEngineMismatchContext(
      { node: '>=20', npm: '>=8 <11' },
      { node: '>=18', npm: '>=10 <12' },
    )
    const result = await checkEngineMismatch(ctx)

    expect(result).toBeDefined()
    expect(result!.message).toContain('npm')
    expect(result!.message).toContain('partial overlap')
  })

  it('should include multiple engine mismatches in one diagnostic', async () => {
    const ctx = createEngineMismatchContext(
      { node: '^18.0.0', npm: '^9.0.0' },
      { node: '>=20', npm: '>=10' },
    )
    const result = await checkEngineMismatch(ctx)

    expect(result).toBeDefined()
    expect(result!.message).toContain('node')
    expect(result!.message).toContain('npm')
  })

  it('should not flag when package ranges are compatible', async () => {
    const ctx = createEngineMismatchContext(
      { node: '>=20', npm: '>=10' },
      { node: '>=18', npm: '>=10' },
    )

    expect(await checkEngineMismatch(ctx)).toBeUndefined()
  })

  it('should not flag when package does not declare the dependency engine', async () => {
    const ctx = createEngineMismatchContext(
      { node: '>=20' },
      { npm: '>=10' },
    )

    expect(await checkEngineMismatch(ctx)).toBeUndefined()
  })

  it('should not flag when either engines is missing', async () => {
    expect(await checkEngineMismatch(createEngineMismatchContext(undefined, { node: '>=18' }))).toBeUndefined()
    expect(await checkEngineMismatch(createEngineMismatchContext({ node: '>=18' }, undefined))).toBeUndefined()
  })

  it('should skip engines with non-standard semver values', async () => {
    const ctx = createEngineMismatchContext(
      { node: '>=18' },
      { node: 'lts' },
    )

    expect(await checkEngineMismatch(ctx)).toBeUndefined()
  })
})
