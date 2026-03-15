import type { CodeActionContext, TextDocument } from 'vscode'
import { describe, expect, it } from 'vitest'
import { CodeActionKind, ConfigurationTarget, Diagnostic, DiagnosticSeverity, Range, Uri } from 'vscode'
import { QuickFixProvider } from './quick-fix'

const provider = new QuickFixProvider()

const uri = Uri.file('/package.json')
const range = new Range(0, 0, 0, 6)
const document = { uri } as TextDocument

function createDiagnostic(code: string | { value: string, target: Uri }, message: string) {
  const diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Hint)
  diagnostic.code = code
  return diagnostic
}

function provideCodeActions(diagnostics: Diagnostic[]) {
  return provider.provideCodeActions(
    document,
    diagnostics[0]!.range,
    { diagnostics } as unknown as CodeActionContext,
  )
}

describe('quick fix provider', () => {
  it('upgrade', () => {
    const diagnostic = createDiagnostic('upgrade', '"vite" can be upgraded to ^2.0.0.')
    const actions = provideCodeActions([diagnostic])

    expect(actions).toHaveLength(3)
    expect(actions[0]!.title).toMatchInlineSnapshot('"Upgrade to ^2.0.0"')
    expect(actions[1]!.title).toMatchInlineSnapshot('"Ignore upgrade for "vite@^2.0.0" (Workspace)"')
    expect(actions[1]!.kind).toBe(CodeActionKind.QuickFix)
    expect(actions[1]!.command?.arguments).toEqual(['upgrade', 'vite@^2.0.0', ConfigurationTarget.Workspace])
    expect(actions[2]!.title).toMatchInlineSnapshot('"Ignore upgrade for "vite@^2.0.0" (User)"')
    expect(actions[2]!.kind).toBe(CodeActionKind.QuickFix)
    expect(actions[2]!.command?.arguments).toEqual(['upgrade', 'vite@^2.0.0', ConfigurationTarget.Global])
  })

  it('vulnerability with fix', () => {
    const diagnostic = createDiagnostic(
      { value: 'vulnerability', target: Uri.parse('https://npmx.dev') },
      '"lodash@4.17.20" has 1 high vulnerability. Upgrade to ^4.17.21 to fix.',
    )
    const actions = provideCodeActions([diagnostic])

    expect(actions).toHaveLength(3)
    expect(actions[0]!.title).toMatchInlineSnapshot('"Upgrade to ^4.17.21 to fix vulnerabilities"')
    expect(actions[1]!.title).toMatchInlineSnapshot('"Ignore vulnerability for "lodash@4.17.20" (Workspace)"')
    expect(actions[2]!.title).toMatchInlineSnapshot('"Ignore vulnerability for "lodash@4.17.20" (User)"')
  })

  it('vulnerability without fix', () => {
    const diagnostic = createDiagnostic(
      { value: 'vulnerability', target: Uri.parse('https://npmx.dev') },
      '"express@4.18.0" has 1 moderate vulnerability.',
    )
    const actions = provideCodeActions([diagnostic])

    expect(actions).toHaveLength(2)
    expect(actions[0]!.title).toMatchInlineSnapshot('"Ignore vulnerability for "express@4.18.0" (Workspace)"')
    expect(actions[1]!.title).toMatchInlineSnapshot('"Ignore vulnerability for "express@4.18.0" (User)"')
  })

  it('vulnerability for scoped package', () => {
    const diagnostic = createDiagnostic(
      { value: 'vulnerability', target: Uri.parse('https://npmx.dev') },
      '"@babel/core@7.0.0" has 1 critical vulnerability. Upgrade to ^7.1.0 to fix.',
    )
    const actions = provideCodeActions([diagnostic])

    expect(actions).toHaveLength(3)
    expect(actions[1]!.title).toMatchInlineSnapshot('"Ignore vulnerability for "@babel/core@7.0.0" (Workspace)"')
  })

  it('mixed diagnostics', () => {
    const diagnostics = [
      createDiagnostic('upgrade', '"vite" can be upgraded to ^2.0.0.'),
      createDiagnostic(
        { value: 'vulnerability', target: Uri.parse('https://npmx.dev') },
        '"lodash@4.17.20" has 1 high vulnerability. Upgrade to ^4.17.21 to fix.',
      ),
    ]
    const actions = provideCodeActions(diagnostics)

    expect(actions).toHaveLength(6)
    expect(actions[0]!.title).toMatchInlineSnapshot('"Upgrade to ^2.0.0"')
    expect(actions[3]!.title).toMatchInlineSnapshot('"Upgrade to ^4.17.21 to fix vulnerabilities"')
  })
})
