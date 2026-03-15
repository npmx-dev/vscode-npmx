import { NPMX_DEV_API } from '#shared/constants'
import { all } from 'module-replacements'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

const replacementsByName = new Map(
  all.moduleReplacements.map((r) => [r.moduleName, r]),
)

const vulnerabilityResults: Record<string, Record<string, unknown>> = {
  'pkg-crit@1.0.0': {
    package: 'pkg-crit',
    version: '1.0.0',
    vulnerablePackages: [],
    deprecatedPackages: [],
    totalPackages: 1,
    failedQueries: 0,
    totalCounts: { total: 1, critical: 1, high: 0, moderate: 0, low: 0 },
  },
  'pkg-multi@1.0.0': {
    package: 'pkg-multi',
    version: '1.0.0',
    vulnerablePackages: [],
    deprecatedPackages: [],
    totalPackages: 1,
    failedQueries: 0,
    totalCounts: { total: 3, critical: 1, high: 2, moderate: 0, low: 0 },
  },
  'pkg-fix@1.0.0': {
    package: 'pkg-fix',
    version: '1.0.0',
    vulnerablePackages: [{
      name: 'pkg-fix',
      version: '1.0.0',
      depth: 'root',
      path: [],
      vulnerabilities: [{ id: 'GHSA-1', summary: '', severity: 'high', aliases: [], url: '', fixedIn: '1.2.0' }],
      counts: { total: 1, critical: 0, high: 1, moderate: 0, low: 0 },
    }],
    deprecatedPackages: [],
    totalPackages: 1,
    failedQueries: 0,
    totalCounts: { total: 1, critical: 0, high: 1, moderate: 0, low: 0 },
  },
  'pkg-safe@1.0.0': {
    package: 'pkg-safe',
    version: '1.0.0',
    vulnerablePackages: [],
    deprecatedPackages: [],
    totalPackages: 1,
    failedQueries: 0,
    totalCounts: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
  },
}

const server = setupServer(
  http.get(`${NPMX_DEV_API}/replacements/:name`, ({ params }) => {
    const data = replacementsByName.get(params.name as string)
    return data
      ? HttpResponse.json(data)
      : new HttpResponse(null, { status: 404 })
  }),

  http.get(`${NPMX_DEV_API}/registry/vulnerabilities/:name/v/:version`, ({ params }) => {
    const key = `${params.name}@${params.version}`
    const data = vulnerabilityResults[key]
    return data
      ? HttpResponse.json(data)
      : new HttpResponse(null, { status: 404 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
