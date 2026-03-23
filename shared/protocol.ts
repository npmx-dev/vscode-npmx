/* eslint-disable ts/no-namespace */

export const GET_PACKAGE_MANAGER_METHOD = 'npmx/getPackageManager'

export namespace GetPackageManagerRequest {
  export interface ParamsType {
    uri: string
  }
  export type ResponseType = 'npm' | 'pnpm' | 'yarn'
  export type ErrorType = never
}
