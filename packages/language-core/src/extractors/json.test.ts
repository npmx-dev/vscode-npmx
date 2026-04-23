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
})
