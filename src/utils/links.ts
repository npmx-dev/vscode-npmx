import { NPMX_DEV } from '#constants'

export function npmxPackageUrl(name: string, version?: string): string {
  return version
    ? `${NPMX_DEV}/package/${name}/v/${version}`
    : `${NPMX_DEV}/package/${name}`
}

export function npmxDocsUrl(name: string, version: string): string {
  return `${NPMX_DEV}/docs/${name}/v/${version}`
}

export function npmxFileUrl(name: string, version: string, path: string, startLine?: number, endLine?: number): string {
  const base = `${NPMX_DEV}/package-code/${name}/v/${version}/${path}`

  if (startLine === undefined)
    return base

  if (endLine !== undefined && endLine !== startLine)
    return `${base}#L${startLine}-L${endLine}`

  return `${base}#L${startLine}`
}

export function jsrPackageUrl(name: string, version: string): string {
  return `https://jsr.io/${name}@${version}`
}
