import { describe, expect, it } from 'vitest'
import { DiagnosticTag } from 'vscode'
import { checkDeprecation } from '../../src/providers/diagnostics/rules/deprecation'
import { createContext } from './context'

describe('checkDeprecation', () => {
  it('should flag deprecated version', async () => {
    const deprecated = 'Use undici instead'
    const ctx = createContext({
      name: 'request',
      version: '^1.0.0',
      distTags: { latest: '1.0.0' },
      versionsMeta: { '1.0.0': { deprecated } },
    })
    const result = await checkDeprecation(ctx)

    expect(result).toBeDefined()
    expect(result!.message).toContain('deprecated')
    expect(result!.message).toContain(deprecated)
    expect(result!.tags).toContain(DiagnosticTag.Deprecated)
    expect(result!.code).toMatchObject({ value: 'deprecation' })
  })

  it('should not flag non-deprecated version', async () => {
    const ctx = createContext({
      name: 'lodash',
      version: '^1.0.0',
      distTags: { latest: '1.0.0' },
      versionsMeta: { '1.0.0': {} },
    })
    const result = await checkDeprecation(ctx)

    expect(result).toBeUndefined()
  })
})
