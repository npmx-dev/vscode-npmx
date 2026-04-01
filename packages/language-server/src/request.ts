import type { Connection } from '@volar/language-server'
import type { GetResolvedDependenciesRequest } from 'npmx-shared/protocol'
import type { WorkspaceState } from './workspace'
import { RequestType } from '@volar/language-server'
import { GET_RESOLVED_DEPENDENCIES_METHOD } from 'npmx-shared/protocol'

const getResolvedDependenciesRequestType = new RequestType<
  GetResolvedDependenciesRequest.ParamsType,
  GetResolvedDependenciesRequest.ResponseType,
  GetResolvedDependenciesRequest.ErrorType
>(GET_RESOLVED_DEPENDENCIES_METHOD)

export function registerRequests(connection: Connection, workspaceState: WorkspaceState) {
  connection.onRequest(
    getResolvedDependenciesRequestType,
    async (params): Promise<GetResolvedDependenciesRequest.ResponseType> => workspaceState.getResolvedDependencies(params.uri),
  )
}
