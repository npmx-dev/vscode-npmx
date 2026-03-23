/* eslint-disable ts/no-namespace */
import type { PackageManager } from 'npmx-language-core/workspace'

export namespace GetPackageManagerRequest {
  export interface ParamsType {
    uri: string
  }
  export type ResponseType = PackageManager
  export type ErrorType = never
}
