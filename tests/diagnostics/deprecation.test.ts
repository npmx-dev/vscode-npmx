import { describe, expect, it } from 'vitest'
import { DiagnosticTag } from 'vscode'
import { checkDeprecation } from '../../src/providers/diagnostics/rules/deprecation'
import { createContext } from './context'

function createDeprecationContext(version: string) {
  return createContext({
    name: 'lodash',
    version,
    distTags: { latest: '2.0.0' },
    versionsMeta: {
      '1.0.0': {
        deprecated: 'deprecated',
      },
      '2.0.0': {},
    },
  })
}

describe('checkDeprecation', () => {
  it('should flag deprecated version', async () => {
    const ctx = createDeprecationContext('^1.0.0')
    const result = await checkDeprecation(ctx)

    expect(result).toBeDefined()
    expect(result!.message).toContain('deprecated')
    expect(result!.tags).toContain(DiagnosticTag.Deprecated)
    expect(result!.code).toMatchObject({ value: 'deprecation' })
  })

  it('should not flag non-deprecated version', async () => {
    const ctx = createDeprecationContext('^2.0.0')
    const result = await checkDeprecation(ctx)

    expect(result).toBeUndefined()
  })
})
