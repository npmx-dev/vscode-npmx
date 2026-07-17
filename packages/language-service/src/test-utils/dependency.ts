import type { DependencyInfo } from 'npmx-language-core/workspace'

export function createDependencyInfo(overrides: Partial<DependencyInfo> = {}): DependencyInfo {
  return {
    category: 'dependencies',
    rawName: 'lodash',
    rawSpec: '^1.0.0',
    nameRange: [0, 0],
    specRange: [0, 0],
    protocol: 'npm',
    resolvedName: 'lodash',
    resolvedSpec: '^1.0.0',
    resolvedProtocol: 'npm',
    packageInfo: async () => null,
    resolvedVersion: async () => null,
    ...overrides,
  }
}
