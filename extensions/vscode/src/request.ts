import type { BaseLanguageClient } from '@volar/vscode'
import type { GetPackageManagerRequest } from 'npmx-shared/protocol'
import { RequestType } from '@volar/vscode'
import { GET_PACKAGE_MANAGER_METHOD } from 'npmx-shared/protocol'
import { commands, Uri } from 'vscode'

const getPackageManagerRequestType = new RequestType<
  GetPackageManagerRequest.ParamsType,
  GetPackageManagerRequest.ResponseType,
  GetPackageManagerRequest.ErrorType
>(GET_PACKAGE_MANAGER_METHOD)

export function registerRequests(client: BaseLanguageClient) {
  client.onRequest(
    getPackageManagerRequestType,
    async (params): Promise<GetPackageManagerRequest.ResponseType> => {
      try {
        const result = await commands.executeCommand<GetPackageManagerRequest.ResponseType>('npm.packageManager', Uri.parse(params.uri))
        return result || 'npm'
      } catch {
        return 'npm'
      }
    },
  )
}
