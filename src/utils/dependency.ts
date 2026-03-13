import type { CatalogsInfo, ResolvedDependencyInfo } from '#types/context'
import { isJsrNpmPackage, jsrNpmToJsrName, parsePackageId } from '#utils/package'

interface FinalResolution extends Pick<ResolvedDependencyInfo, 'resolvedName' | 'resolvedSpec' | 'resolvedProtocol'> {
}

interface DependencySpecResolution extends FinalResolution, Pick<ResolvedDependencyInfo, 'protocol' | 'categoryName'> {
}

const DEFAULT_CATALOG_NAME = 'default'
const GIT_PATTERN = /^(?:git\+|git:\/\/|github:|gitlab:|bitbucket:|ssh:\/\/git@)/i
const HTTP_PATTERN = /^https?:/i

export function normalizeCatalogName(name: string): string {
  return name.trim() || DEFAULT_CATALOG_NAME
}

function resolveNpmSpec(rawName: string, spec: string): FinalResolution {
  const alias = parsePackageId(spec)
  if (!alias.version) {
    return {
      resolvedName: rawName,
      resolvedSpec: spec,
      resolvedProtocol: 'npm',
    }
  }

  if (isJsrNpmPackage(alias.name)) {
    return {
      resolvedName: jsrNpmToJsrName(alias.name),
      resolvedSpec: alias.version,
      resolvedProtocol: 'jsr',
    }
  }

  return {
    resolvedName: alias.name,
    resolvedSpec: alias.version,
    resolvedProtocol: 'npm',
  }
}

function resolveEffectiveSpec(rawName: string, rawSpec: string, catalogs?: CatalogsInfo): FinalResolution {
  const spec = rawSpec.trim()

  if (spec.startsWith('catalog:')) {
    const categoryName = normalizeCatalogName(spec.slice('catalog:'.length))
    const catalogSpec = catalogs?.[categoryName]?.[rawName]

    if (!catalogSpec) {
      return {
        resolvedName: rawName,
        resolvedSpec: spec,
        resolvedProtocol: 'catalog',
      }
    }

    return resolveEffectiveSpec(rawName, catalogSpec, catalogs)
  }

  if (spec.startsWith('workspace:')) {
    return {
      resolvedName: rawName,
      resolvedSpec: spec.slice('workspace:'.length),
      resolvedProtocol: 'workspace',
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
      resolvedSpec: spec,
      resolvedProtocol: 'file',
    }
  }

  if (GIT_PATTERN.test(spec)) {
    return {
      resolvedName: rawName,
      resolvedSpec: spec,
      resolvedProtocol: 'git',
    }
  }

  if (HTTP_PATTERN.test(spec)) {
    return {
      resolvedName: rawName,
      resolvedSpec: spec,
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

export function resolveDependencySpec(rawName: string, rawSpec: string, catalogs: CatalogsInfo = {}): DependencySpecResolution {
  const spec = rawSpec.trim()
  const effective = resolveEffectiveSpec(rawName, rawSpec, catalogs)

  if (spec.startsWith('catalog:')) {
    return {
      protocol: 'catalog',
      categoryName: normalizeCatalogName(spec.slice('catalog:'.length)),
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
