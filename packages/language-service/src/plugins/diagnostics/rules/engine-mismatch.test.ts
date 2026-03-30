import { describe, expect, it } from 'vitest'
import { resolveEngineMismatches } from './engine-mismatch'

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
