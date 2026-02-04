import { NPMJS_COM, NPMX_DEV } from '#constants'

export function npmPacakgeUrl(name: string, version?: string): string {
  return version
    ? `${NPMJS_COM}/package/${name}/v/${version}`
    : `${NPMJS_COM}/package/${name}`
}

export function npmxPackageUrl(name: string, version?: string): string {
  return version
    ? `${NPMX_DEV}/package/${name}/v/${version}`
    : `${NPMX_DEV}/package/${name}`
}

export function npmxDocsUrl(name: string, version: string): string {
  return `${NPMX_DEV}/docs/${name}/v/${version}`
}
