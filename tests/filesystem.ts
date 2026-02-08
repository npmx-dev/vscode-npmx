import { expect, vi } from 'vitest'
import { workspace } from 'vscode'

/**
 * Mocks the VS Code filesystem by intercepting {@link workspace.fs}.
 *
 * @param files A record mapping file paths to their string content.
 */
export function mockFileSystem(files: Record<string, string>) {
  // Make all functions throw by default.
  for (const [name, fn] of Object.entries(workspace.fs)) {
    if (typeof fn === 'function') {
      vi.mocked(fn).mockImplementation(() => {
        expect.fail(`\`workspace.fs.${name}\` is not supported as a fake.`)
      })
    }
  }

  vi.mocked(workspace.fs.readFile).mockImplementation(async (uri) => {
    const path = uri.path
    const content = files[path]
    if (content === undefined) {
      throw new Error(`File not found: ${uri.toString()}`)
    }
    return new TextEncoder().encode(content)
  })
}
