import type { DependencyProtocol, ResolvedDependencyInfo } from '#types/context'
import { isJsrNpmPackage, jsrNpmToJsrName } from '#utils/package'

export interface WorkspacePackageReference {
  name?: string
  version?: string
}

export type CatalogsEntry = Record<string, Record<string, string>>

interface Resolution extends Pick<ResolvedDependencyInfo, 'resolvedName' | 'resolvedSpec'> {
  resolvedProtocol: DependencyProtocol
}

interface DependencySpecResolution extends Resolution, Pick<ResolvedDependencyInfo, 'protocol' | 'categoryName'> {
}

const DEFAULT_CATEGORY_NAME = 'default'
const GIT_PATTERN = /^(?:git\+|git:\/\/|github:|gitlab:|bitbucket:|ssh:\/\/git@)/i
const HTTP_PATTERN = /^https?:/i

export function normalizeCategoryName(name: string | undefined): string {
  return name?.trim() || DEFAULT_CATEGORY_NAME
}

function splitAliasSpec(value: string): { name: string, spec: string } | undefined {
  const separatorIndex = value.lastIndexOf('@')
  if (separatorIndex <= 0)
    return

  return {
    name: value.slice(0, separatorIndex),
    spec: value.slice(separatorIndex + 1),
  }
}

function isWorkspacePathReference(spec: string): boolean {
  return spec.startsWith('.') || spec.startsWith('/')
}

function resolveNpmSpec(rawName: string, spec: string): Pick<DependencySpecResolution, 'resolvedName' | 'resolvedSpec' | 'resolvedProtocol'> {
  const alias = splitAliasSpec(spec)
  if (!alias) {
    return {
      resolvedName: rawName,
      resolvedSpec: spec,
      resolvedProtocol: 'npm',
    }
  }

  if (isJsrNpmPackage(alias.name)) {
    return {
      resolvedName: jsrNpmToJsrName(alias.name),
      resolvedSpec: alias.spec,
      resolvedProtocol: 'jsr',
    }
  }

  return {
    resolvedName: alias.name,
    resolvedSpec: alias.spec,
    resolvedProtocol: 'npm',
  }
}

function resolveEffectiveSpec(rawName: string, rawSpec: string, catalogs?: CatalogsEntry, seenCatalogs = new Set<string>()): Resolution {
  const spec = rawSpec.trim()

  if (spec.startsWith('catalog:')) {
    const categoryName = normalizeCategoryName(spec.slice('catalog:'.length))
    const categoryKey = `${categoryName}:${rawName}`
    if (seenCatalogs.has(categoryKey)) {
      return {
        resolvedName: rawName,
        resolvedSpec: spec,
        resolvedProtocol: 'catalog',
      }
    }

    const catalogSpec = catalogs?.[categoryName]?.[rawName]
    if (!catalogSpec) {
      return {
        resolvedName: rawName,
        resolvedSpec: spec,
        resolvedProtocol: 'catalog',
      }
    }

    const nextSeenCatalogs = new Set(seenCatalogs)
    nextSeenCatalogs.add(categoryKey)
    return resolveEffectiveSpec(rawName, catalogSpec, catalogs, nextSeenCatalogs)
  }

  if (spec.startsWith('workspace:')) {
    const trimmed = spec.trim()
    const alias = !isWorkspacePathReference(trimmed) ? splitAliasSpec(trimmed) : undefined
    const targetName = alias?.name || rawName

    return {
      resolvedName: targetName,
      resolvedSpec: alias?.spec ?? trimmed,
      resolvedProtocol: 'npm',
    }
  }

  if (spec.startsWith('jsr:')) {
    return {
      resolvedName: rawName,
      resolvedSpec: spec.slice('jsr:'.length),
      resolvedProtocol: 'jsr',
    }
  }

  if (spec.startsWith('file:')) {
    return {
      resolvedName: rawName,
      resolvedSpec: rawSpec,
      resolvedProtocol: 'file',
    }
  }

  if (GIT_PATTERN.test(spec)) {
    return {
      resolvedName: rawName,
      resolvedSpec: rawSpec,
      resolvedProtocol: 'git',
    }
  }

  if (HTTP_PATTERN.test(spec)) {
    return {
      resolvedName: rawName,
      resolvedSpec: rawSpec,
      resolvedProtocol: 'http',
    }
  }

  if (spec.startsWith('npm:'))
    return resolveNpmSpec(rawName, spec.slice('npm:'.length))

  return {
    resolvedName: rawName,
    resolvedSpec: spec,
    resolvedProtocol: 'npm',
  }
}

export function resolveDependencySpec(rawName: string, rawSpec: string, catalogs: CatalogsEntry = {}): DependencySpecResolution {
  const spec = rawSpec.trim()
  const effective = resolveEffectiveSpec(rawName, rawSpec, catalogs)

  if (spec.startsWith('catalog:')) {
    return {
      protocol: 'catalog',
      categoryName: normalizeCategoryName(spec.slice('catalog:'.length)),
      ...effective,
    }
  }

  if (spec.startsWith('workspace:')) {
    return {
      protocol: 'workspace',
      ...effective,
    }
  }

  if (spec.startsWith('jsr:')) {
    return {
      protocol: 'jsr',
      ...effective,
    }
  }

  if (spec.startsWith('file:')) {
    return {
      protocol: 'file',
      ...effective,
    }
  }

  if (GIT_PATTERN.test(spec)) {
    return {
      protocol: 'git',
      ...effective,
    }
  }

  if (HTTP_PATTERN.test(spec)) {
    return {
      protocol: 'http',
      ...effective,
    }
  }

  if (spec.startsWith('npm:')) {
    return {
      protocol: effective.resolvedProtocol === 'jsr' ? 'jsr' : 'npm',
      ...effective,
    }
  }

  return {
    protocol: null,
    ...effective,
  }
}
