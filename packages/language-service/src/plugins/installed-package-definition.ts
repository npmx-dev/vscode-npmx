import type { LanguageServicePlugin, LanguageServicePluginInstance, LocationLink, Position } from '@volar/language-service'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { IWorkspaceState } from '../types'
import { isPackageManifest } from 'npmx-language-core/utils'
import { URI } from 'vscode-uri'
import { getResolvedDependencyNameAtOffset } from '../utils/document'

const ZERO_POSITION = { line: 0, character: 0 }

export async function provideInstalledPackageDefinition(
  document: TextDocument,
  position: Position,
  workspaceState: IWorkspaceState,
): Promise<LocationLink[] | undefined> {
  const packageManifestUri = URI.parse(document.uri)
  if (packageManifestUri.scheme !== 'file' || !isPackageManifest(packageManifestUri.path))
    return

  const dependencies = await workspaceState.getResolvedDependencies(document.uri)
  if (!dependencies)
    return

  const offset = document.offsetAt(position)
  const dependency = getResolvedDependencyNameAtOffset(dependencies, offset)
  if (!dependency)
    return

  const targetPath = await workspaceState.findInstalledPackageManifestPath(
    document.uri,
    dependency.rawName,
  )
  if (!targetPath)
    return

  const targetUri = packageManifestUri.with({ path: targetPath })
  const originStart = document.positionAt(dependency.nameRange[0])
  const originEnd = document.positionAt(dependency.nameRange[1])

  return [{
    targetUri: targetUri.toString(),
    targetRange: {
      start: ZERO_POSITION,
      end: ZERO_POSITION,
    },
    targetSelectionRange: {
      start: ZERO_POSITION,
      end: ZERO_POSITION,
    },
    originSelectionRange: {
      start: originStart,
      end: originEnd,
    },
  }]
}

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
  return {
    name: 'npmx-installed-package-definition',
    capabilities: {
      definitionProvider: true,
    },
    create(): LanguageServicePluginInstance {
      return {
        async provideDefinition(document, position): Promise<LocationLink[] | undefined> {
          return provideInstalledPackageDefinition(
            document,
            position,
            workspaceState,
          )
        },
      }
    },
  }
}
