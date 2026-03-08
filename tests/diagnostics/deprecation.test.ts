import { describe, expect, it } from 'vitest'
import { checkDeprecation } from '../../src/providers/diagnostics/rules/deprecation'
import { createContext } from './context'

function createDeprecationContext(version: string) {
  return createContext({
    name: 'lodash',
    version,
    distTags: { latest: '2.0.0' },
    versionsMeta: {
      '1.0.0': {
        deprecated: 'old notice',
      },
      '1.2.0': {
        deprecated: 'new notice',
      },
      '2.0.0': {},
    },
  })
}

describe('checkDeprecation', () => {
  it('should flag deprecated version', async () => {
    const result = await checkDeprecation(createDeprecationContext('1.0.0'))

    expect(result).toMatchObject({
      code: { value: 'deprecation' },
    })
    expect(result!.message).toMatchInlineSnapshot('""lodash@1.0.0" has been deprecated: old notice"')
  })

  it('resolve range to the highest matching deprecated version', async () => {
    const result = await checkDeprecation(createDeprecationContext('^1.0.0'))

    expect(result).toMatchObject({
      code: { value: 'deprecation' },
    })
    expect(result!.message).toMatchInlineSnapshot('""lodash@1.2.0" has been deprecated: new notice"')
  })

  it('should not flag non-deprecated version', async () => {
    expect(await checkDeprecation(createDeprecationContext('^2.0.0'))).toBeUndefined()
  })
})
