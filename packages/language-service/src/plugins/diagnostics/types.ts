import type { Diagnostic } from '@volar/language-service'
import type { OffsetRange } from 'npmx-language-core/types'
import type { DependencyInfo } from 'npmx-language-core/workspace'
import type { IWorkspaceState } from '../../types'

export interface DiagnosticContext {
  uri: string
  dep: DependencyInfo
  pkg: NonNullable<Awaited<ReturnType<DependencyInfo['packageInfo']>>>
  workspace: IWorkspaceState
}

export interface RangeDiagnosticInfo extends Omit<Diagnostic, 'range'> {
  range: OffsetRange
}

export type DiagnosticRule = (ctx: DiagnosticContext, ignoreList: string[]) => Promise<RangeDiagnosticInfo | undefined>
