import type { ConfigKey } from './meta'

type StripPrefix<T, Prefix extends string>
  = T extends `${Prefix}${infer Rest}`
    ? Rest
    : never

export type DiagnosticsCode = StripPrefix<ConfigKey, 'npmx.diagnostics.'>

export type PackageManager = 'npm' | 'pnpm' | 'yarn'
