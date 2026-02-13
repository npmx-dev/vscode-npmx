export type SemverTuple = [number, number, number]

export function parseSemverTuple(version: string): SemverTuple | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match)
    return null

  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export type UpdateType = 'major' | 'minor' | 'patch' | 'prerelease' | 'none'

export function getUpdateType(current: string, latest: string): UpdateType {
  const cur = parseSemverTuple(current)
  const lat = parseSemverTuple(latest)

  if (!cur || !lat)
    return 'none'

  if (lat[0] > cur[0])
    return 'major'
  if (lat[0] < cur[0])
    return 'none'

  if (lat[1] > cur[1])
    return 'minor'
  if (lat[1] < cur[1])
    return 'none'

  if (lat[2] > cur[2])
    return 'patch'
  if (lat[2] < cur[2])
    return 'none'

  if (current !== latest && current.includes('-') && !latest.includes('-'))
    return 'prerelease'

  return 'none'
}
