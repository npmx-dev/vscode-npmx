import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { createTextDocument, createVSCodeMock } from 'jest-mock-vscode'
import { vi } from 'vitest'
import { Uri, workspace } from 'vscode'

import './msw'

vi.mock('vscode', () => createVSCodeMock(vi))

vi.mock('#state', () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
  config: {
    ignore: {
      upgrade: [],
      deprecation: [],
      replacement: [],
      vulnerability: [],
    },
  },
  internalCommands: {},
}))

;(workspace as any).openTextDocument = vi.fn(async (target: Uri | string) => {
  const uri = typeof target === 'string' ? Uri.file(target) : target
  const existingDocument = workspace.textDocuments.find((document) => document.uri.toString() === uri.toString())
  if (existingDocument)
    return existingDocument

  const text = await readFile(uri.fsPath, 'utf8')
  const languageId = extname(uri.fsPath) === '.json' ? 'json' : 'yaml'
  return createTextDocument(uri, text, languageId, 1)
})
