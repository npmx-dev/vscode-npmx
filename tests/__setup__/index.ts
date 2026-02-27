import { vi } from 'vitest'

import './msw'

vi.mock('#state', () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
}))
