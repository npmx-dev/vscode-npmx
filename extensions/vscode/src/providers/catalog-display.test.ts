import type { CancellationToken, InlayHint } from 'vscode'
import { createTextDocument } from 'jest-mock-vscode'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Position, Range, Uri, workspace } from 'vscode'
import { provideCatalogInlayHints } from './catalog-display'

describe('catalog display', () => {
  const document = createTextDocument(Uri.file('/workspace/package.json'), '{"dependencies":{"vue":"catalog:"}}', 'json')
  const range = new Range(0, 0, 0, document.getText().length)
  const token: CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: vi.fn(() => ({ dispose: vi.fn() })),
  }
  const hints: InlayHint[] = [{ position: new Position(0, 32), label: '^3.5.0' }]

  afterEach(async () => {
    await workspace.getConfiguration().update('npmx.catalog.display', undefined)
  })

  it('keeps hints hidden by default and after switching back to decorations', async () => {
    const next = vi.fn(() => hints)
    expect(await provideCatalogInlayHints(document, range, token, next)).toEqual([])
    expect(next).not.toHaveBeenCalled()

    await workspace.getConfiguration().update('npmx.catalog.display', 'inlay-hint')
    expect(await provideCatalogInlayHints(document, range, token, next)).toEqual(hints)
    expect(next).toHaveBeenCalledWith(document, range, token)

    next.mockClear()
    await workspace.getConfiguration().update('npmx.catalog.display', 'decoration')
    expect(await provideCatalogInlayHints(document, range, token, next)).toEqual([])
    expect(next).not.toHaveBeenCalled()
  })

  it('discards hints if the display mode changes while a request is pending', async () => {
    await workspace.getConfiguration().update('npmx.catalog.display', 'inlay-hint')
    const pending = Promise.withResolvers<InlayHint[]>()
    const result = provideCatalogInlayHints(document, range, token, () => pending.promise)

    await workspace.getConfiguration().update('npmx.catalog.display', 'decoration')
    pending.resolve(hints)

    expect(await result).toEqual([])
  })
})
