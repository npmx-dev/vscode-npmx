import type { Connection, LanguageServer } from '@volar/language-server'
import type { DependencyInfo, WorkspaceAdapter } from 'npmx-language-core/workspace'
import type { IWorkspaceState } from 'npmx-language-service/types'
import type { GetPackageManagerRequest } from './protocol'
import { access, readFile } from 'node:fs/promises'
import { RequestType } from '@volar/language-server'
import { isPackageManifest } from 'npmx-language-core/utils'
import { WorkspaceContext } from 'npmx-language-core/workspace'
import { defineCachedFunction } from 'ocache'
import { URI } from 'vscode-uri'

const getPackageManagerRequestType = new RequestType<
  GetPackageManagerRequest.ParamsType,
  GetPackageManagerRequest.ResponseType,
  GetPackageManagerRequest.ErrorType
>('npmx/getPackageManager')

function createLanguageServerAdapter(folderUri: URI, connection: Connection): WorkspaceAdapter {
  return {
    async readFile(path: string): Promise<string> {
      return await readFile(folderUri.with({ path }).fsPath, 'utf-8')
    },

    async fileExists(path: string): Promise<boolean> {
      try {
        await access(folderUri.with({ path }).fsPath)
        return true
      } catch {
        return false
      }
    },

    async detectPackageManager(): Promise<'npm' | 'pnpm' | 'yarn'> {
      try {
        const result = await connection.sendRequest(getPackageManagerRequestType, {
          uri: folderUri.path,
        })
        return result || 'npm'
      } catch {
        return 'npm'
      }
    },
  }
}

export class WorkspaceState implements IWorkspaceState {
  #connection: Connection
  #server: LanguageServer

  constructor(connection: Connection, server: LanguageServer) {
    this.#connection = connection
    this.#server = server
  }

  #getWorkspaceContextByFolder = defineCachedFunction<
    WorkspaceContext | undefined,
    [URI]
  >(
    async (folderUri) => {
      this.#connection.console.info(`[workspace-context] built ${folderUri.path}`)

      return await WorkspaceContext.create(
        folderUri.path,
        createLanguageServerAdapter(folderUri, this.#connection),
      )
    },
    {
      name: 'workspace-context',
      getKey: (folderUri) => folderUri.path,
      swr: false,
      maxAge: 0,
      staleMaxAge: 0,
    },
  )

  #getWorkspaceFolderUri(uriString: string): URI | undefined {
    const uri = URI.parse(uriString)
    const uriPath = uri.path

    let bestMatch: URI | undefined
    let bestLength = 0

    for (const folderUri of this.#server.workspaceFolders.all) {
      const folderPath = folderUri.path.endsWith('/') ? folderUri.path : `${folderUri.path}/`
      if (uriPath.startsWith(folderPath) && folderPath.length > bestLength) {
        bestMatch = folderUri
        bestLength = folderPath.length
      }
    }

    return bestMatch
  }

  async getWorkspaceContext(uriString: string): Promise<WorkspaceContext | undefined> {
    const folderUri = this.#getWorkspaceFolderUri(uriString)
    if (!folderUri)
      return

    return await this.#getWorkspaceContextByFolder(folderUri)
  }

  async getResolvedDependencies(uriString: string): Promise<DependencyInfo[] | undefined> {
    const ctx = await this.getWorkspaceContext(uriString)
    if (!ctx)
      return

    const uri = URI.parse(uriString)
    return (
      isPackageManifest(uri.path)
        ? await ctx.loadPackageManifestInfo(uri.path)
        : await ctx.loadWorkspaceFileInfo(uri.path)
    )?.dependencies
  }
}

export function createWorkspaceState(connection: Connection, server: LanguageServer) {
  return new WorkspaceState(connection, server)
}
