import type { ConfigKey } from '../generated-meta'

type StripPrefix<T, Prefix extends string>
  = T extends `${Prefix}${infer Rest}`
    ? Rest
    : never

export type DiagnosticsCode = StripPrefix<ConfigKey, 'npmx.diagnostics.'>
