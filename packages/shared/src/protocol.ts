/* eslint-disable ts/no-namespace */

export const GET_RESOLVED_DEPENDENCIES_METHOD = 'npmx/getResolvedDependencies'

export namespace GetResolvedDependenciesRequest {
  export interface Dependency {
    protocol: string | null
    resolvedSpec: string
    specRange: [start: number, end: number]
  }

  export interface ParamsType {
    uri: string
  }
  export type ResponseType = Dependency[] | undefined
  export type ErrorType = never
}
