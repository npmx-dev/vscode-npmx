import { describe, expect, it } from 'vitest'
import { checkEngineMismatch, resolveEngineMismatches } from '../../src/providers/diagnostics/rules/engine-mismatch'
import { createContext } from './context'

describe('resolveEngineMismatches', () => {
  it('should flag when engine ranges do not overlap', () => {
    expect(resolveEngineMismatches(
      { node: '^18.0.0' },
      { node: '>=20' },
    )).toMatchObject([
      {
        engine: 'node',
        packageRange: '^18.0.0',
        dependencyRange: '>=20',
        hasIntersection: false,
      },
    ])
  })

  it('should flag when engine ranges overlap but are not fully compatible', () => {
    expect(resolveEngineMismatches(
      { node: '>=20', npm: '>=8 <11' },
      { node: '>=18', npm: '>=10 <12' },
    )).toMatchObject([{
      engine: 'npm',
      hasIntersection: true,
    }])
  })

  it('should include multiple engine mismatches', () => {
    expect(resolveEngineMismatches(
      { node: '^18.0.0', npm: '^9.0.0' },
      { node: '>=20', npm: '>=10' },
    )).toMatchObject([
      { engine: 'node' },
      { engine: 'npm' },
    ])
  })

  it('should not flag when package ranges are compatible', () => {
    expect(resolveEngineMismatches(
      { node: '>=20', npm: '>=10' },
      { node: '>=18', npm: '>=10' },
    )).toEqual([])
  })

  it('should not flag when package does not declare the dependency engine', () => {
    expect(resolveEngineMismatches(
      { node: '>=20' },
      { npm: '>=10' },
    )).toEqual([])
  })

  it('should skip engines with non-standard semver values', () => {
    expect(resolveEngineMismatches(
      { node: '>=18' },
      { node: 'lts' },
    )).toEqual([])
  })
})

describe('checkEngineMismatch', () => {
  it('should format a diagnostic when mismatches exist', async () => {
    const result = await checkEngineMismatch(createContext({
      name: 'foo',
      version: '^1.0.0',
      distTags: { latest: '1.0.0' },
      versionsMeta: {
        '1.0.0': {
          engines: { node: '>=20' },
        },
      },
      engines: { node: '^18.0.0' },
    }))

    expect(result).toBeDefined()
    expect(result!.code).toMatchObject({ value: 'engine-mismatch' })
    expect(result!.message).toContain('requires ">=20", but package supports "^18.0.0"')
  })

  it('should not flag when either engines is missing', async () => {
    expect(await checkEngineMismatch(createContext({
      name: 'foo',
      version: '^1.0.0',
      distTags: { latest: '1.0.0' },
      versionsMeta: {
        '1.0.0': { engines: { node: '>=18' } },
      },
    }))).toBeUndefined()

    expect(await checkEngineMismatch(createContext({
      name: 'foo',
      version: '^1.0.0',
      distTags: { latest: '1.0.0' },
      versionsMeta: {
        '1.0.0': {},
      },
      engines: { node: '>=18' },
    }))).toBeUndefined()
  })
})
