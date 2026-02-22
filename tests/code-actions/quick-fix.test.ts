import type { CodeActionContext, TextDocument } from 'vscode'
import { CATALOG_DIAGNOSTIC_RELATED_INFO_PREFIX } from '#constants'
import { describe, expect, it } from 'vitest'
import { Diagnostic, DiagnosticSeverity, Range, Uri } from 'vscode'
import { QuickFixProvider } from '../../src/providers/code-actions/quick-fix'

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
    const diagnostic = createDiagnostic('upgrade', 'New version available: ^2.0.0')
    const actions = provideCodeActions([diagnostic])

    expect(actions).toHaveLength(1)
    expect(actions[0]!.title).toMatchInlineSnapshot('"Update to ^2.0.0"')
  })

  it('vulnerability', () => {
    const diagnostic = createDiagnostic(
      { value: 'vulnerability', target: Uri.parse('https://npmx.dev') },
      'This version has 1 high vulnerability. Upgrade to ^1.2.3 to fix.',
    )
    const actions = provideCodeActions([diagnostic])

    expect(actions).toHaveLength(1)
    expect(actions[0]!.title).toMatchInlineSnapshot('"Update to ^1.2.3 to fix vulnerability"')
  })

  it('mixed diagnostics', () => {
    const diagnostics = [
      createDiagnostic('upgrade', 'New version available: ^2.0.0'),
      createDiagnostic(
        { value: 'vulnerability', target: Uri.parse('https://npmx.dev') },
        'This version has 1 high vulnerability. Upgrade to ^1.2.3 to fix.',
      ),
    ]
    const actions = provideCodeActions(diagnostics)

    expect(actions).toHaveLength(2)
    expect(actions[0]!.title).toMatchInlineSnapshot('"Update to ^2.0.0"')
    expect(actions[1]!.title).toMatchInlineSnapshot('"Update to ^1.2.3 to fix vulnerability"')
  })

  it('vulnerability with catalog related information', () => {
    const diagnostic = createDiagnostic(
      { value: 'vulnerability', target: Uri.parse('https://npmx.dev') },
      'This version has 1 high vulnerability. Upgrade to ^1.2.3 to fix.',
    )
    diagnostic.relatedInformation = [
      {
        location: {
          uri: Uri.file('/pnpm-workspace.yaml'),
          range,
        },
        message: `${CATALOG_DIAGNOSTIC_RELATED_INFO_PREFIX}default`,
      },
    ] as any

    const actions = provideCodeActions([diagnostic])
    expect(actions).toHaveLength(2)
    expect(actions[0]!.title).toMatchInlineSnapshot('"Open catalog entry in pnpm-workspace.yaml"')
    expect(actions[1]!.title).toMatchInlineSnapshot('"Update catalog entry to ^1.2.3 to fix vulnerability"')
  })
})
