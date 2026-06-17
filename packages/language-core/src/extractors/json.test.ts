import { describe, expect, it } from 'vitest'
import { JsonExtractor } from './json'

describe('jsonExtractor', () => {
  const extractor = new JsonExtractor()

  it('extracts bun workspace catalogs from package.json', () => {
    const info = extractor.getWorkspaceCatalogInfo(`{
      "workspaces": ["packages/*"],
      "catalog": {
        "lodash": "^4.17.21"
      },
      "catalogs": {
        "prod": {
          "@deno/doc": "jsr:^0.189.1"
        }
      }
    }`)

    expect(info?.catalogs).toEqual({
      default: {
        lodash: '^4.17.21',
      },
      prod: {
        '@deno/doc': 'jsr:^0.189.1',
      },
    })
    expect(info?.dependencies.map(({ rawName, rawSpec, categoryName }) => ({
      rawName,
      rawSpec,
      categoryName,
    }))).toEqual([
      {
        rawName: 'lodash',
        rawSpec: '^4.17.21',
        categoryName: '',
      },
      {
        rawName: '@deno/doc',
        rawSpec: 'jsr:^0.189.1',
        categoryName: 'prod',
      },
    ])
  })

  it('extracts catalogs nested inside the workspaces object', () => {
    const info = extractor.getWorkspaceCatalogInfo(`{
      "workspaces": {
        "packages": ["packages/*"],
        "catalog": {
          "react": "^19.0.0"
        },
        "catalogs": {
          "test": {
            "vitest": "^4.0.0"
          }
        }
      }
    }`)

    expect(info?.catalogs).toEqual({
      default: {
        react: '^19.0.0',
      },
      test: {
        vitest: '^4.0.0',
      },
    })
  })

  describe('getPackageManifestInfo', () => {
    it('extracts overrides and resolutions from all package managers', () => {
      const info = extractor.getPackageManifestInfo(`{
        "name": "test-pkg",
        "overrides": {
          "lodash": "npm:lodash-es@^4.17.21",
          "semver": "^7.0.0"
        },
        "resolutions": {
          "**/lodash": "npm:lodash-es@^4.17.21",
          "semver": "^7.0.0"
        },
        "pnpm": {
          "overrides": {
            "lodash": "npm:lodash-es@^4.17.21",
            "semver": "^7.0.0"
          }
        }
      }`)

      const overrides = info?.dependencies.filter((d) => d.category === 'overrides')
      const resolutions = info?.dependencies.filter((d) => d.category === 'resolutions')

      expect(overrides).toHaveLength(4)
      expect(resolutions).toHaveLength(2)

      expect(overrides?.map(({ rawName, rawSpec }) => ({ rawName, rawSpec }))).toEqual([
        { rawName: 'lodash', rawSpec: 'npm:lodash-es@^4.17.21' },
        { rawName: 'semver', rawSpec: '^7.0.0' },
        { rawName: 'lodash', rawSpec: 'npm:lodash-es@^4.17.21' },
        { rawName: 'semver', rawSpec: '^7.0.0' },
      ])

      expect(resolutions?.map(({ rawName, rawSpec }) => ({ rawName, rawSpec }))).toEqual([
        { rawName: 'lodash', rawSpec: 'npm:lodash-es@^4.17.21' },
        { rawName: 'semver', rawSpec: '^7.0.0' },
      ])
    })

    it('skips nested override objects', () => {
      const info = extractor.getPackageManifestInfo(`{
        "name": "test-pkg",
        "overrides": {
          "lodash": "npm:lodash-es@^4.17.21",
          "express": {
            "body-parser": "^1.0.0"
          }
        }
      }`)

      expect(info?.dependencies.filter((d) => d.category === 'overrides')).toHaveLength(1)
    })

    it('includes overrides alongside regular dependencies', () => {
      const info = extractor.getPackageManifestInfo(`{
        "name": "test-pkg",
        "dependencies": {
          "lodash": "^4.17.21"
        },
        "devDependencies": {
          "vitest": "^4.0.0"
        },
        "overrides": {
          "lodash": "npm:lodash-es@^4.17.21"
        },
        "resolutions": {
          "semver": "npm:semver-ns@^7.0.0"
        }
      }`)

      expect(info?.dependencies).toHaveLength(4)
      expect(info?.dependencies.map(({ rawName, category }) => ({ rawName, category }))).toEqual([
        { rawName: 'lodash', category: 'dependencies' },
        { rawName: 'vitest', category: 'devDependencies' },
        { rawName: 'lodash', category: 'overrides' },
        { rawName: 'semver', category: 'resolutions' },
      ])
    })
  })
})
