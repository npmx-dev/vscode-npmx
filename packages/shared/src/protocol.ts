/* eslint-disable ts/no-namespace */

import type { DependencyInfo } from 'npmx-language-core/workspace'

export const GET_RESOLVED_DEPENDENCIES_METHOD = 'npmx/getResolvedDependencies'

export namespace GetResolvedDependenciesRequest {
  export interface ParamsType {
    uri: string
  }
  export type ResponseType = DependencyInfo[] | undefined
  export type ErrorType = never
}
