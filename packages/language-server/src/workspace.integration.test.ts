import { cwd } from 'node:process'
import { describe, expect, it } from 'vitest'
import { URI } from 'vscode-uri'
import { detectPackageManagerFromProject } from './workspace'

describe('detectPackageManagerFromProject', () => {
  it('detects the real repository as pnpm', async () => {
    await expect(detectPackageManagerFromProject(URI.file(cwd()).path)).resolves.toBe('pnpm')
  })
})
