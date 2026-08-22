import { detect } from 'package-manager-detector/detect'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectPackageManagerFromProject } from './workspace'

vi.mock('package-manager-detector/detect', () => ({
  detect: vi.fn(),
}))

describe('detectPackageManagerFromProject', () => {
  afterEach(() => {
    vi.mocked(detect).mockReset()
  })

  it('falls back to npm for unsupported detectors', async () => {
    vi.mocked(detect).mockResolvedValue({ name: 'deno', agent: 'deno' })

    await expect(detectPackageManagerFromProject('/repo')).resolves.toBe('npm')
  })

  it('falls back to npm when no package manager is detected', async () => {
    vi.mocked(detect).mockResolvedValue(null)

    await expect(detectPackageManagerFromProject('/repo')).resolves.toBe('npm')
  })
})
