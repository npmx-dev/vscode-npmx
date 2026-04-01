import type { BaseLanguageClient } from '@volar/vscode'
import type { GetResolvedDependenciesRequest } from 'npmx-shared/protocol'
import type { Uri } from 'vscode'
import { logger } from '#state'
import { RequestType } from '@volar/vscode'
import { GET_RESOLVED_DEPENDENCIES_METHOD } from 'npmx-shared/protocol'

const getResolvedDependenciesRequestType = new RequestType<
  GetResolvedDependenciesRequest.ParamsType,
  GetResolvedDependenciesRequest.ResponseType,
  GetResolvedDependenciesRequest.ErrorType
>(GET_RESOLVED_DEPENDENCIES_METHOD)

export async function getResolvedDependencies(client: BaseLanguageClient, uri: Uri) {
  try {
    return client.sendRequest(getResolvedDependenciesRequestType, { uri: uri.toString() })
  } catch (err) {
    logger.error(`Failed to resolve dependencies for ${uri.toString()}: ${String(err)}`)
    return []
  }
}
