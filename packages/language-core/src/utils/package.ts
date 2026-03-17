export function formatPackageId(name: string, version: string): string {
  return `${name}@${version}`
}

export function parsePackageId(id: string): {
  name: string
  version: string | null
} {
  const separatorIndex = id.lastIndexOf('@')
  if (separatorIndex <= 0) {
    return {
      name: id,
      version: null,
    }
  }

  return {
    name: id.slice(0, separatorIndex),
    version: id.slice(separatorIndex + 1) || null,
  }
}

const JSR_NPM_SCOPE = '@jsr/'

export function isJsrNpmPackage(name: string): boolean {
  return name.startsWith(JSR_NPM_SCOPE)
}

export function jsrNpmToJsrName(name: string): string {
  if (!isJsrNpmPackage(name))
    return name

  const bare = name.slice(JSR_NPM_SCOPE.length)
  const separatorIndex = bare.indexOf('__')
  if (separatorIndex === -1)
    return bare
  return `@${bare.slice(0, separatorIndex)}/${bare.slice(separatorIndex + 2)}`
}
