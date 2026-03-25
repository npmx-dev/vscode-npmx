import type { Hover, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-service'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import type { IWorkspaceState } from '../types'
import { jsrPackageUrl, npmxDocsUrl, npmxPackageUrl } from 'npmx-language-core/links'
import { getImportSpecifierAtOffset, isDependencyFile } from 'npmx-language-core/utils'
import { URI } from 'vscode-uri'
import { getConfig } from '../config'
import { getResolvedDependencyAtOffset } from '../utils/range'

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
  const SPACER = '&nbsp;'

  async function renderHover(dep: DependencyInfo): Promise<Hover | undefined> {
    const { resolvedName, resolvedSpec, resolvedProtocol, packageInfo } = dep

    switch (resolvedProtocol) {
      case 'jsr': {
        const jsrPackageLink = `[$(package)${SPACER}View on jsr.io](${jsrPackageUrl(resolvedName)})`

        return {
          contents: {
            kind: 'markdown',
            value: `${jsrPackageLink} | $(warning) Not on npmx`,
          },
        } satisfies Hover
      }
      case 'npm': {
        const pkg = await packageInfo()
        if (!pkg) {
          return {
            contents: {
              kind: 'markdown',
              value: '$(warning) Unable to fetch package information',
            },
          } satisfies Hover
        }

        const resolvedVersion = await dep.resolvedVersion()
        let content = ''
        if (resolvedVersion && pkg.versionsMeta[resolvedVersion]?.provenance) {
          content += `[$(verified)${SPACER}Verified provenance](${npmxPackageUrl(resolvedName, resolvedSpec)}#provenance)\n\n`
        }

        const packageLink = `[$(package)${SPACER}View on npmx.dev](${npmxPackageUrl(resolvedName)})`
        const docsLink = `[$(book)${SPACER}View docs on npmx.dev](${npmxDocsUrl(resolvedName, resolvedSpec)})`

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

            return renderHover(dep)
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

            return renderHover(dep)
          }
        },
      }
    },
  }
}
