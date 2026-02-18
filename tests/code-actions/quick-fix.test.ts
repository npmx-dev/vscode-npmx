import type { CodeActionContext, Diagnostic, TextDocument } from 'vscode'
import { describe, expect, it, vi } from 'vitest'
import { Range, Uri } from 'vscode'
import { QuickFixProvider } from '../../src/providers/code-actions/quick-fix'

const provider = new QuickFixProvider()

function createDiagnostic(options: { code?: string | { value: string }, message: string }): Diagnostic {
  return {
    code: options.code,
    message: options.message,
    range: new Range(0, 0, 0, 6),
  } as Diagnostic
}

function createTextDocument(): TextDocument {
  return {
    uri: Uri.parse('file:///package.json'),
    getText: vi.fn(),
  } as unknown as TextDocument
}

function provideCodeActions(diagnostics: Diagnostic[]) {
  return provider.provideCodeActions(
    createTextDocument(),
    diagnostics[0]!.range,
    { diagnostics, triggerKind: 1, only: undefined } as unknown as CodeActionContext,
  )
}

describe('quick fix provider', () => {
  describe('upgrade', () => {
    it('provides a quick fix for upgrade diagnostic', () => {
      const diagnostic = createDiagnostic({
        code: 'upgrade',
        message: 'New version available: ^2.0.0',
      })

      const actions = provideCodeActions([diagnostic])

      expect(actions).toEqual([
        expect.objectContaining({
          title: 'Update to ^2.0.0',
          isPreferred: false,
        }),
      ])
    })

    it('does not provide a quick fix when message format is unexpected', () => {
      const diagnostic = createDiagnostic({
        code: 'upgrade',
        message: 'Something else',
      })

      expect(provideCodeActions([diagnostic])).toHaveLength(0)
    })
  })

  describe('vulnerability', () => {
    it('provides a quick fix when message includes upgrade version', () => {
      const diagnostic = createDiagnostic({
        code: { value: 'vulnerability' },
        message: 'This version has 1 high vulnerability. Upgrade to ^1.2.3 to fix.',
      })

      const actions = provideCodeActions([diagnostic])

      expect(actions).toEqual([
        expect.objectContaining({
          title: 'Update to ^1.2.3 to fix vulnerabilities',
          isPreferred: true,
        }),
      ])
    })

    it('does not provide a quick fix when message has no upgrade target', () => {
      const diagnostic = createDiagnostic({
        code: { value: 'vulnerability' },
        message: 'This version has 1 high vulnerability.',
      })

      expect(provideCodeActions([diagnostic])).toHaveLength(0)
    })
  })

  it('ignores diagnostics without a code', () => {
    const diagnostic = createDiagnostic({ message: 'some message' })
    expect(provideCodeActions([diagnostic])).toHaveLength(0)
  })

  it('ignores diagnostics with unknown code', () => {
    const diagnostic = createDiagnostic({ code: 'deprecation', message: 'deprecated' })
    expect(provideCodeActions([diagnostic])).toHaveLength(0)
  })
})
