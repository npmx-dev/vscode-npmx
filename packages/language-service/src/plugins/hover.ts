import type { Hover, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-service'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import type { IWorkspaceState } from '../types'
import { jsrPackageUrl, npmxDocsUrl, npmxPackageUrl } from 'npmx-language-core/links'
import { getImportSpecifierAtOffset, isDependencyFile } from 'npmx-language-core/utils'
import { URI } from 'vscode-uri'
import { getConfig } from '../config'
import { getResolvedDependencyAtOffset } from '../utils/document'

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
  async function renderHover(dep: DependencyInfo, useCodicons: boolean): Promise<Hover | undefined> {
    const { resolvedName, resolvedSpec, resolvedProtocol, packageInfo } = dep

    switch (resolvedProtocol) {
      case 'jsr': {
        const jsrPackageLink = useCodicons
          ? `[$(package)&nbsp;View on jsr.io](${jsrPackageUrl(resolvedName)})`
          : `[View on jsr.io](${jsrPackageUrl(resolvedName)})`

        return {
          contents: {
            kind: 'markdown',
            value: useCodicons
              ? `${jsrPackageLink} | $(warning) Not on npmx.dev`
              : `${jsrPackageLink} | Not on npmx.dev`,
          },
        } satisfies Hover
      }
      case 'npm': {
        const pkg = await packageInfo()
        if (!pkg) {
          return {
            contents: {
              kind: 'markdown',
              value: useCodicons
                ? '$(warning) Unable to fetch package information'
                : 'Unable to fetch package information.',
            },
          } satisfies Hover
        }

        const resolvedVersion = await dep.resolvedVersion()
        let content = ''
        if (resolvedVersion && pkg.versionsMeta[resolvedVersion]?.provenance) {
          content += useCodicons
            ? `[$(verified)&nbsp;Verified provenance](${npmxPackageUrl(resolvedName, resolvedSpec)}#provenance)\n\n`
            : `[Verified provenance](${npmxPackageUrl(resolvedName, resolvedSpec)}#provenance)\n\n`
        }

        const packageLink = useCodicons
          ? `[$(package)&nbsp;View on npmx.dev](${npmxPackageUrl(resolvedName)})`
          : `[View on npmx.dev](${npmxPackageUrl(resolvedName)})`
        const docsLink = useCodicons
          ? `[$(book)&nbsp;View docs on npmx.dev](${npmxDocsUrl(resolvedName, resolvedSpec)})`
          : `[View docs on npmx.dev](${npmxDocsUrl(resolvedName, resolvedSpec)})`

        content += `${packageLink} | ${docsLink}`

        return {
          contents: {
            kind: 'markdown',
            value: content,
          },
        }
      }
    }
  }

  return {
    name: 'npmx-hover',
    capabilities: {
      hoverProvider: true,
    },
    create(context): LanguageServicePluginInstance {
      return {
        async provideHover(document, position): Promise<Hover | undefined> {
          if (!await getConfig(context, 'npmx.hover.enabled'))
            return
          const useCodicons = workspaceState.getEditorFlavor() === 'vscode'

          const uri = URI.parse(document.uri)
          if (uri.scheme !== 'file')
            return

          const offset = document.offsetAt(position)

          if (isDependencyFile(uri.path)) {
            const dependencies = await workspaceState.getResolvedDependencies(document.uri)
            if (!dependencies)
              return
            const dep = getResolvedDependencyAtOffset(dependencies, offset)
            if (!dep)
              return

            return renderHover(dep, useCodicons)
          } else {
            const text = document.getText()
            const specifier = getImportSpecifierAtOffset(text, offset)
            if (!specifier)
              return

            const { packageName } = specifier

            const dependencies = await workspaceState.getResolvedDependenciesForContainingPackage(document.uri)
            const dep = dependencies?.find((d) => d.rawName === packageName)
            if (!dep)
              return

            return renderHover(dep, useCodicons)
          }
        },
      }
    },
  }
}
