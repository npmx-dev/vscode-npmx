import type { Hover, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-service'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import type { IWorkspaceState } from '../types'
import { jsrPackageUrl, npmxDocsUrl, npmxPackageUrl } from 'npmx-language-core/links'
import { getImportSpecifierAtOffset, isDependencyFile } from 'npmx-language-core/utils'
import { URI } from 'vscode-uri'
import { getConfig } from '../config'
import { getResolvedDependencyAtOffset } from '../utils/document'

function iconLabel(useCodicons: boolean, codicon: string, unicode: string, label: string): string {
  return useCodicons
    ? `$(${codicon})&nbsp;${label}`
    : `${unicode} ${label}`
}

function iconText(useCodicons: boolean, codicon: string, unicode: string, text: string): string {
  return useCodicons
    ? `$(${codicon}) ${text}`
    : `${unicode} ${text}`
}

function markdownLink(label: string, url: string): string {
  return `[${label}](${url})`
}

export async function renderHoverMarkdown(dep: DependencyInfo, useCodicons: boolean): Promise<string | undefined> {
  const { resolvedName, resolvedSpec, resolvedProtocol, packageInfo } = dep

  switch (resolvedProtocol) {
    case 'jsr': {
      const jsrPackageLink = markdownLink(
        iconLabel(useCodicons, 'package', '📦', 'View on jsr.io'),
        jsrPackageUrl(resolvedName),
      )

      return `${jsrPackageLink} | ${iconText(useCodicons, 'warning', '⚠', 'Not on npmx.dev')}`
    }
    case 'npm': {
      const pkg = await packageInfo()
      if (!pkg)
        return iconText(useCodicons, 'warning', '⚠', 'Unable to fetch package information.')

      const resolvedVersion = await dep.resolvedVersion()
      let content = ''
      if (resolvedVersion && pkg.versionsMeta[resolvedVersion]?.provenance) {
        content += `${markdownLink(
          iconLabel(useCodicons, 'verified', '✓', 'Verified provenance'),
          `${npmxPackageUrl(resolvedName, resolvedSpec)}#provenance`,
        )}\n\n`
      }

      const packageLink = markdownLink(
        iconLabel(useCodicons, 'package', '📦', 'View on npmx.dev'),
        npmxPackageUrl(resolvedName),
      )
      const docsLink = markdownLink(
        iconLabel(useCodicons, 'book', '📖', 'View docs on npmx.dev'),
        npmxDocsUrl(resolvedName, resolvedSpec),
      )

      return `${content}${packageLink} | ${docsLink}`
    }
  }
}

async function renderHover(dep: DependencyInfo, useCodicons: boolean): Promise<Hover | undefined> {
  const content = await renderHoverMarkdown(dep, useCodicons)
  if (!content)
    return

  return {
    contents: {
      kind: 'markdown',
      value: content,
    },
  } satisfies Hover
}

export function create(workspaceState: IWorkspaceState): LanguageServicePlugin {
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
          const { markdownIcons } = workspaceState.getClientFeatures()

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

            return renderHover(dep, markdownIcons)
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

            return renderHover(dep, markdownIcons)
          }
        },
      }
    },
  }
}
