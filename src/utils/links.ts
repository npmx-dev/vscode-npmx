import { NPMX_DEV } from '#constants'

export function npmxPackageUrl(name: string, version?: string): string {
  return version
    ? `${NPMX_DEV}/package/${name}/v/${version}`
    : `${NPMX_DEV}/package/${name}`
}

export function npmxDocsUrl(name: string, version: string): string {
  return `${NPMX_DEV}/docs/${name}/v/${version}`
}

export function jsrPackageUrl(name: string, version: string): string {
  return `https://jsr.io/${name}@${version}`
}
