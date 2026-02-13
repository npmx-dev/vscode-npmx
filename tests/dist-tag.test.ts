import { describe, expect, it } from 'vitest'
import { checkDistTag } from '../src/providers/diagnostics/rules/dist-tag'

type DistTagDependency = Parameters<typeof checkDistTag>[0]
type DistTagPackageInfo = Parameters<typeof checkDistTag>[1]

function createDependency(name: string, version: string): DistTagDependency {
  return {
    name,
    version,
    nameNode: {},
    versionNode: {},
  }
}

function createPackageInfo(distTags: Record<string, string>): DistTagPackageInfo {
  return { distTags } as DistTagPackageInfo
}

describe('checkDistTag', () => {
  it('should flag "latest" as a dist tag', async () => {
    const dependency = createDependency('lodash', 'latest')
    const packageInfo = createPackageInfo({ latest: '2.0.0' })

    const result = await checkDistTag(dependency, packageInfo)

    expect(result).toBeDefined()
  })

  it('should flag "next" as a dist tag', async () => {
    const dependency = createDependency('vue', 'next')
    const packageInfo = createPackageInfo({ latest: '2.0.0', next: '3.0.0-beta' })

    const result = await checkDistTag(dependency, packageInfo)

    expect(result).toBeDefined()
  })

  it('should flag common dist tags even when metadata does not include them', async () => {
    const distTagNames = ['next', 'beta', 'canary', 'stable']

    for (const distTagName of distTagNames) {
      const dependency = createDependency('lodash', distTagName)
      const packageInfo = createPackageInfo({})
      const result = await checkDistTag(dependency, packageInfo)

      expect(result).toBeDefined()
    }
  })

  it('should flag "npm:latest" as a dist tag', async () => {
    const dependency = createDependency('lodash', 'npm:latest')
    const packageInfo = createPackageInfo({ latest: '2.0.0' })

    const result = await checkDistTag(dependency, packageInfo)

    expect(result).toBeDefined()
  })

  it('should not flag pinned semver', async () => {
    const dependency = createDependency('lodash', '1.0.0')
    const packageInfo = createPackageInfo({ latest: '2.0.0' })

    const result = await checkDistTag(dependency, packageInfo)

    expect(result).toBeUndefined()
  })

  it('should not flag pinned semver with v prefix', async () => {
    const dependency = createDependency('lodash', 'v1.2.3')
    const packageInfo = createPackageInfo({ latest: '2.0.0' })

    const result = await checkDistTag(dependency, packageInfo)

    expect(result).toBeUndefined()
  })

  it('should not flag npm protocol pinned semver with v prefix', async () => {
    const dependency = createDependency('lodash', 'npm:v1.2.3')
    const packageInfo = createPackageInfo({ latest: '2.0.0' })

    const result = await checkDistTag(dependency, packageInfo)

    expect(result).toBeUndefined()
  })

  it('should flag unknown tag-like versions', async () => {
    const dependency = createDependency('lodash', 'edge-channel')
    const packageInfo = createPackageInfo({})

    const result = await checkDistTag(dependency, packageInfo)

    expect(result).toBeDefined()
  })

  it('should flag uncommon tags when package metadata does not include them', async () => {
    const dependency = createDependency('lodash', 'preview')
    const packageInfo = createPackageInfo({ latest: '1.0.0' })

    const result = await checkDistTag(dependency, packageInfo)

    expect(result).toBeDefined()
  })

  it('should not flag wildcard ranges', async () => {
    const dependency = createDependency('lodash', '*')
    const packageInfo = createPackageInfo({ latest: '1.0.0' })

    const result = await checkDistTag(dependency, packageInfo)

    expect(result).toBeUndefined()
  })

  it('should not flag workspace packages', async () => {
    const dependency = createDependency('lodash', 'workspace:*')
    const packageInfo = createPackageInfo({ latest: '1.0.0' })

    const result = await checkDistTag(dependency, packageInfo)

    expect(result).toBeUndefined()
  })

  it('should not flag URL-based version', async () => {
    const dependency = createDependency('lodash', 'https://github.com/user/repo')
    const packageInfo = createPackageInfo({ latest: '1.0.0' })

    const result = await checkDistTag(dependency, packageInfo)

    expect(result).toBeUndefined()
  })
})
