import { createVSCodeMock } from 'jest-mock-vscode'
import { vi } from 'vitest'

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
