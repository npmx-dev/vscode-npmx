import { describe, expect, it } from 'vitest'
import { resolveDependencySpec } from '../../src/utils/dependency-spec'

describe('resolveDependencySpec', () => {
  it('resolves plain npm specs as npm protocol', () => {
    expect(resolveDependencySpec('vite', '^6.0.0')).toMatchObject({
      protocol: 'npm',
      resolvedName: 'vite',
      resolvedSpec: '^6.0.0',
    })
  })

  it('resolves npm aliases', () => {
    expect(resolveDependencySpec('my-nuxt', 'npm:nuxt@latest')).toMatchObject({
      protocol: 'npm',
      resolvedName: 'nuxt',
      resolvedSpec: 'latest',
    })
  })

  it('resolves npm aliases that point to jsr packages', () => {
    expect(resolveDependencySpec('@deno/doc', 'npm:@jsr/deno__doc@^1.0.0')).toMatchObject({
      protocol: 'jsr',
      resolvedName: '@deno/doc',
      resolvedSpec: '^1.0.0',
    })
  })

  it('resolves jsr specs', () => {
    expect(resolveDependencySpec('@deno/doc', 'jsr:^0.189.1')).toMatchObject({
      protocol: 'jsr',
      resolvedName: '@deno/doc',
      resolvedSpec: '^0.189.1',
    })
  })

  it('resolves workspace specs with local versions', () => {
    expect(resolveDependencySpec('pkg-a', 'workspace:*', {
      resolveWorkspacePackage: () => ({ name: 'pkg-a', version: '1.2.3' }),
    })).toMatchObject({
      protocol: 'workspace',
      resolvedName: 'pkg-a',
      resolvedSpec: '1.2.3',
    })

    expect(resolveDependencySpec('pkg-a', 'workspace:^', {
      resolveWorkspacePackage: () => ({ name: 'pkg-a', version: '1.2.3' }),
    })).toMatchObject({
      protocol: 'workspace',
      resolvedName: 'pkg-a',
      resolvedSpec: '^1.2.3',
    })
  })

  it('resolves default and named catalogs', () => {
    expect(resolveDependencySpec('lodash', 'catalog:', {
      catalogs: {
        default: {
          lodash: '^4.17.21',
        },
      },
    })).toMatchObject({
      protocol: 'catalog',
      categoryName: 'default',
      resolvedName: 'lodash',
      resolvedSpec: '^4.17.21',
    })

    expect(resolveDependencySpec('vite', 'catalog:dev', {
      catalogs: {
        dev: {
          vite: 'npm:vite@latest',
        },
      },
    })).toMatchObject({
      protocol: 'catalog',
      categoryName: 'dev',
      resolvedName: 'vite',
      resolvedSpec: 'latest',
    })
  })

  it('preserves unsupported file, git and http protocols', () => {
    expect(resolveDependencySpec('pkg-a', 'file:../pkg-a')).toMatchObject({
      protocol: 'file',
      resolvedName: 'pkg-a',
      resolvedSpec: 'file:../pkg-a',
    })

    expect(resolveDependencySpec('pkg-a', 'git+https://github.com/user/repo.git')).toMatchObject({
      protocol: 'git',
      resolvedName: 'pkg-a',
      resolvedSpec: 'git+https://github.com/user/repo.git',
    })

    expect(resolveDependencySpec('pkg-a', 'https://example.com/pkg.tgz')).toMatchObject({
      protocol: 'http',
      resolvedName: 'pkg-a',
      resolvedSpec: 'https://example.com/pkg.tgz',
    })
  })
})
