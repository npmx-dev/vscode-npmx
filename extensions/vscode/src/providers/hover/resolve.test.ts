import type { DependencyInfo } from 'npmx-language-core/workspace'
import type { Position, TextDocument } from 'vscode'
import { getResolvedDependencies, getResolvedDependencyByOffset } from '#core/workspace'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Uri } from 'vscode'
import { findUp } from 'vscode-find-up'
import { resolveHoverDependency } from './resolve'

vi.mock('#core/workspace', () => ({
  getResolvedDependencies: vi.fn(),
  getResolvedDependencyByOffset: vi.fn(),
}))

vi.mock('vscode-find-up', () => ({
  findUp: vi.fn(),
}))

const mockedGetResolvedDependencies = vi.mocked(getResolvedDependencies)
const mockedGetResolvedDependencyByOffset = vi.mocked(getResolvedDependencyByOffset)
const mockedFindUp = vi.mocked(findUp)

function getOffset(text: string, target: string): number {
  const index = text.indexOf(target)
  if (index === -1)
    throw new Error(`Missing target "${target}" in test input`)

  return index + 1
}

function getPosition(text: string, target: string): Position {
  const offset = getOffset(text, target)
  const lines = text.slice(0, offset).split('\n')

  return {
    line: lines.length - 1,
    character: (lines.at(-1)?.length ?? 1) - 1,
  } as Position
}

function createDependencyInfo(overrides: Partial<DependencyInfo> = {}): DependencyInfo {
  return {
    category: 'dependencies',
    rawName: 'lodash',
    rawSpec: '^1.0.0',
    nameRange: [0, 0],
    specRange: [0, 0],
    protocol: null,
    resolvedName: 'lodash',
    resolvedSpec: '^1.0.0',
    resolvedProtocol: 'npm',
    packageInfo: async () => null,
    resolvedVersion: async () => null,
    ...overrides,
  }
}

function createDocument(path: string, text: string): TextDocument {
  const lines = text.split('\n')

  function getLineStartOffset(line: number): number {
    return lines
      .slice(0, line)
      .reduce((total, current) => total + current.length + 1, 0)
  }

  function getWordRangeAtPosition(position: Position) {
    const lineText = lines[position.line] ?? ''
    const char = lineText[position.character]
    if (!char || !/[\w-]/.test(char))
      return

    let start = position.character
    let end = position.character + 1

    while (start > 0 && /[\w-]/.test(lineText[start - 1]!))
      start--

    while (end < lineText.length && /[\w-]/.test(lineText[end]!))
      end++

    return {
      start: { line: position.line, character: start },
      end: { line: position.line, character: end },
    }
  }

  return {
    uri: Uri.file(path),
    getText: () => text,
    getWordRangeAtPosition,
    lineAt: (line: number) => ({
      text: lines[line] ?? '',
      lineNumber: line,
      range: {
        start: { line, character: 0 },
        end: { line, character: (lines[line] ?? '').length },
      },
      rangeIncludingLineBreak: {
        start: { line, character: 0 },
        end: { line, character: (lines[line] ?? '').length + 1 },
      },
      firstNonWhitespaceCharacterIndex: (lines[line] ?? '').search(/\S|$/),
      isEmptyOrWhitespace: !(lines[line] ?? '').trim(),
    }),
    offsetAt: (position: Position) => getLineStartOffset(position.line) + position.character,
  } as unknown as TextDocument
}

describe('resolveHoverDependency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should resolve source imports from the nearest package.json', async () => {
    const text = 'import foo from \'lodash\''
    const document = createDocument('/workspace/src/index.ts', text)
    const pkgJsonUri = Uri.file('/workspace/package.json')
    const dependency = createDependencyInfo()

    mockedFindUp.mockResolvedValue(pkgJsonUri)
    mockedGetResolvedDependencies.mockResolvedValue([dependency])

    const resolved = await resolveHoverDependency(document, getPosition(text, 'lodash'))

    expect(resolved).toBe(dependency)
    expect(mockedFindUp).toHaveBeenCalledWith('package.json', { cwd: document.uri })
    expect(mockedGetResolvedDependencies).toHaveBeenCalledWith(pkgJsonUri)
  })

  it('should match package roots for import subpaths', async () => {
    const text = 'import \'lodash/fp\''
    const document = createDocument('/workspace/src/index.ts', text)
    const dependency = createDependencyInfo()

    mockedFindUp.mockResolvedValue(Uri.file('/workspace/package.json'))
    mockedGetResolvedDependencies.mockResolvedValue([dependency])

    const resolved = await resolveHoverDependency(document, getPosition(text, 'lodash'))

    expect(resolved).toBe(dependency)
  })

  it('should reuse aliased dependency metadata', async () => {
    const text = 'import \'foo/subpath\''
    const document = createDocument('/workspace/src/index.ts', text)
    const dependency = createDependencyInfo({
      rawName: 'foo',
      rawSpec: 'npm:bar@^2.0.0',
      protocol: 'npm',
      resolvedName: 'bar',
      resolvedSpec: '^2.0.0',
    })

    mockedFindUp.mockResolvedValue(Uri.file('/workspace/package.json'))
    mockedGetResolvedDependencies.mockResolvedValue([dependency])

    const resolved = await resolveHoverDependency(document, getPosition(text, 'foo'))

    expect(resolved).toBe(dependency)
    expect(resolved?.resolvedName).toBe('bar')
  })

  it('should return undefined for undeclared imports', async () => {
    const text = 'import \'react\''
    const document = createDocument('/workspace/src/index.ts', text)

    mockedFindUp.mockResolvedValue(Uri.file('/workspace/package.json'))
    mockedGetResolvedDependencies.mockResolvedValue([
      createDependencyInfo({ rawName: 'lodash' }),
    ])

    await expect(resolveHoverDependency(document, getPosition(text, 'react'))).resolves.toBeUndefined()
  })

  it('should keep package manifest hover on the existing path', async () => {
    const text = '"dependencies": { "lodash": "^1.0.0" }'
    const document = createDocument('/workspace/package.json', text)
    const dependency = createDependencyInfo()
    const position = getPosition(text, 'lodash')

    mockedGetResolvedDependencyByOffset.mockResolvedValue(dependency)

    const resolved = await resolveHoverDependency(document, position)

    expect(resolved).toBe(dependency)
    expect(mockedGetResolvedDependencyByOffset).toHaveBeenCalledWith(document.uri, document.offsetAt(position))
    expect(mockedFindUp).not.toHaveBeenCalled()
    expect(mockedGetResolvedDependencies).not.toHaveBeenCalled()
  })

  it('should return early when the hover position is not on a word', async () => {
    const text = 'import foo from \'lodash\''
    const document = createDocument('/workspace/src/index.ts', text)

    await expect(resolveHoverDependency(document, { line: 0, character: 6 } as Position)).resolves.toBeUndefined()
    expect(mockedFindUp).not.toHaveBeenCalled()
    expect(mockedGetResolvedDependencies).not.toHaveBeenCalled()
  })

  it('should return early when the hover word is not inside a string', async () => {
    const text = 'const lodash = someValue'
    const document = createDocument('/workspace/src/index.ts', text)

    await expect(resolveHoverDependency(document, getPosition(text, 'lodash'))).resolves.toBeUndefined()
    expect(mockedFindUp).not.toHaveBeenCalled()
    expect(mockedGetResolvedDependencies).not.toHaveBeenCalled()
  })

  it('should return undefined when import context is not on the current line', async () => {
    const text = [
      'import {',
      '  foo,',
      '} from',
      '  \'lodash\'',
    ].join('\n')
    const document = createDocument('/workspace/src/index.ts', text)

    await expect(resolveHoverDependency(document, getPosition(text, 'lodash'))).resolves.toBeUndefined()
    expect(mockedFindUp).not.toHaveBeenCalled()
    expect(mockedGetResolvedDependencies).not.toHaveBeenCalled()
  })
})
