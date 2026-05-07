import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectPackageManagerFromProject } from './workspace'

vi.mock('package-manager-detector/detect', () => ({
  detect: vi.fn(),
}))

const { detect } = await import('package-manager-detector/detect')

describe('detectPackageManagerFromProject', () => {
  afterEach(() => {
    vi.mocked(detect).mockReset()
  })

  it('returns supported package managers directly', async () => {
    vi.mocked(detect).mockResolvedValue({ name: 'pnpm', agent: 'pnpm' })

    await expect(detectPackageManagerFromProject('/repo')).resolves.toBe('pnpm')
    expect(detect).toHaveBeenCalledWith({
      cwd: '/repo',
      stopDir: '/repo',
    })
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
