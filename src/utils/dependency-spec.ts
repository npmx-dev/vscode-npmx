import type { DependencyProtocol } from '#types/context'
import { isJsrNpmPackage, jsrNpmToJsrName } from '#utils/package'

export interface WorkspacePackageReference {
  name?: string
  version?: string
}

export interface ResolveDependencySpecOptions {
  catalogs?: Record<string, Record<string, string>>
  resolveWorkspacePackage?: (name: string) => WorkspacePackageReference | undefined
  resolveWorkspacePackageByPath?: (path: string) => WorkspacePackageReference | undefined
}

export interface DependencySpecResolution {
  protocol: DependencyProtocol
  categoryName?: string
  resolvedName: string
  resolvedSpec: string
  finalProtocol: DependencyProtocol
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

function transformWorkspaceSpec(spec: string, version: string): string {
  if (spec === '' || spec === '*' || isWorkspacePathReference(spec))
    return version
  if (spec === '^' || spec === '~')
    return `${spec}${version}`

  return spec
}

function resolveNpmSpec(rawName: string, spec: string) {
  const alias = splitAliasSpec(spec)
  if (!alias) {
    return {
      resolvedName: rawName,
      resolvedSpec: spec,
      finalProtocol: 'npm' as const,
    }
  }

  if (isJsrNpmPackage(alias.name)) {
    return {
      resolvedName: jsrNpmToJsrName(alias.name),
      resolvedSpec: alias.spec,
      finalProtocol: 'jsr' as const,
    }
  }

  return {
    resolvedName: alias.name,
    resolvedSpec: alias.spec,
    finalProtocol: 'npm' as const,
  }
}

function resolveWorkspaceSpec(rawName: string, spec: string, options: ResolveDependencySpecOptions) {
  const trimmed = spec.trim()
  const alias = !isWorkspacePathReference(trimmed) ? splitAliasSpec(trimmed) : undefined
  const targetName = alias?.name || rawName
  const packageRef = isWorkspacePathReference(trimmed)
    ? options.resolveWorkspacePackageByPath?.(trimmed)
    : options.resolveWorkspacePackage?.(targetName)

  if (!packageRef?.version) {
    return {
      resolvedName: packageRef?.name || targetName,
      resolvedSpec: trimmed,
      finalProtocol: 'workspace' as const,
    }
  }

  return {
    resolvedName: packageRef.name || targetName,
    resolvedSpec: transformWorkspaceSpec(alias?.spec ?? trimmed, packageRef.version),
    finalProtocol: 'npm' as const,
  }
}

function resolveEffectiveSpec(rawName: string, rawSpec: string, options: ResolveDependencySpecOptions, seenCatalogs = new Set<string>()) {
  const spec = rawSpec.trim()

  if (spec.startsWith('catalog:')) {
    const categoryName = normalizeCategoryName(spec.slice('catalog:'.length))
    const categoryKey = `${categoryName}:${rawName}`
    if (seenCatalogs.has(categoryKey)) {
      return {
        resolvedName: rawName,
        resolvedSpec: spec,
        finalProtocol: 'catalog' as const,
      }
    }

    const catalogSpec = options.catalogs?.[categoryName]?.[rawName]
    if (!catalogSpec) {
      return {
        resolvedName: rawName,
        resolvedSpec: spec,
        finalProtocol: 'catalog' as const,
      }
    }

    const nextSeenCatalogs = new Set(seenCatalogs)
    nextSeenCatalogs.add(categoryKey)
    return resolveEffectiveSpec(rawName, catalogSpec, options, nextSeenCatalogs)
  }

  if (spec.startsWith('workspace:'))
    return resolveWorkspaceSpec(rawName, spec.slice('workspace:'.length), options)

  if (spec.startsWith('jsr:')) {
    return {
      resolvedName: rawName,
      resolvedSpec: spec.slice('jsr:'.length),
      finalProtocol: 'jsr' as const,
    }
  }

  if (spec.startsWith('file:')) {
    return {
      resolvedName: rawName,
      resolvedSpec: rawSpec,
      finalProtocol: 'file' as const,
    }
  }

  if (GIT_PATTERN.test(spec)) {
    return {
      resolvedName: rawName,
      resolvedSpec: rawSpec,
      finalProtocol: 'git' as const,
    }
  }

  if (HTTP_PATTERN.test(spec)) {
    return {
      resolvedName: rawName,
      resolvedSpec: rawSpec,
      finalProtocol: 'http' as const,
    }
  }

  if (spec.startsWith('npm:'))
    return resolveNpmSpec(rawName, spec.slice('npm:'.length))

  return {
    resolvedName: rawName,
    resolvedSpec: spec,
    finalProtocol: 'npm' as const,
  }
}

export function resolveDependencySpec(rawName: string, rawSpec: string, options: ResolveDependencySpecOptions = {}): DependencySpecResolution {
  const spec = rawSpec.trim()
  const effective = resolveEffectiveSpec(rawName, rawSpec, options)

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
      protocol: effective.finalProtocol === 'jsr' ? 'jsr' : 'npm',
      ...effective,
    }
  }

  return {
    protocol: 'npm',
    ...effective,
  }
}
