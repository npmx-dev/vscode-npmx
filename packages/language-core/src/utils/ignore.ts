import { formatPackageId, parsePackageId } from './package'

export function checkIgnored(options: {
  ignoreList: string[]
  name: string
  version?: string | null
}): boolean {
  const { ignoreList, name, version } = options

  if (ignoreList.includes(name))
    return true

  if (version)
    return ignoreList.includes(formatPackageId(name, version))

  const parsed = parsePackageId(name)
  if (!parsed.version)
    return false

  return ignoreList.includes(parsed.name)
}
