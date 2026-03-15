import { describe, expect, it } from 'vitest'
import { createContext } from './__tests__/utils'
import { checkDistTag } from './dist-tag'

describe('checkDistTag', () => {
  it('should flag when version matches a dist tag', async () => {
    expect(await checkDistTag(
      createContext({ name: 'lodash', version: 'latest', distTags: { latest: '2.0.0' } }),
    )).toMatchObject({
      code: { value: 'dist-tag' },
    })
  })

  it('should not flag when version does not match any dist tag', async () => {
    expect(await checkDistTag(
      createContext({ name: 'lodash', version: 'next', distTags: { latest: '2.0.0' } }),
    )).toBeUndefined()
  })
})
