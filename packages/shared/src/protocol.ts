/* eslint-disable ts/no-namespace */

import type { DependencyInfo, PackageManager } from 'npmx-language-core/workspace'

export const GET_PACKAGE_MANAGER_METHOD = 'npmx/getPackageManager'

export namespace GetPackageManagerRequest {
  export interface ParamsType {
    uri: string
  }
  export type ResponseType = PackageManager
  export type ErrorType = never
}

export const GET_RESOLVED_DEPENDENCIES_METHOD = 'npmx/getResolvedDependencies'

export namespace GetResolvedDependenciesRequest {
  export interface ParamsType {
    uri: string
  }
  export type ResponseType = DependencyInfo[] | undefined
  export type ErrorType = never
}
