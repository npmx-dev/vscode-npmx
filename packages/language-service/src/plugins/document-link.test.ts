import { describe, expect, it } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { createDependencyInfo } from '../test-utils/dependency'
import { providePackageDocumentLinks } from './document-link'

describe('providePackageDocumentLinks', () => {
  it('links package version specs to npmx', async () => {
    const sourceText = '{"dependencies":{"lodash":"^1.0.0"}}'
    const document = TextDocument.create(
      'file:///repo/package.json',
      'json',
      0,
      sourceText,
    )
    const nameStart = sourceText.indexOf('lodash')
    const specStart = sourceText.indexOf('^1.0.0')
    const specEnd = specStart + '^1.0.0'.length

    await expect(providePackageDocumentLinks(
      document,
      [createDependencyInfo({
        nameRange: [nameStart, nameStart + 'lodash'.length],
        specRange: [specStart, specEnd],
      })],
      'declared',
    )).resolves.toEqual([{
      range: {
        start: document.positionAt(specStart),
        end: document.positionAt(specEnd),
      },
      target: 'https://npmx.dev/package/lodash/v/^1.0.0',
      tooltip: 'Open lodash@^1.0.0 on npmx',
    }])
  })

  it('does not link catalog specs', async () => {
    const sourceText = '{"dependencies":{"lodash":"catalog:"}}'
    const document = TextDocument.create(
      'file:///repo/package.json',
      'json',
      0,
      sourceText,
    )
    const nameStart = sourceText.indexOf('lodash')
    const specStart = sourceText.indexOf('catalog:')

    await expect(providePackageDocumentLinks(
      document,
      [createDependencyInfo({
        rawSpec: 'catalog:',
        nameRange: [nameStart, nameStart + 'lodash'.length],
        specRange: [specStart, specStart + 'catalog:'.length],
        protocol: 'catalog',
        resolvedSpec: '^1.0.0',
        resolvedProtocol: 'npm',
      })],
      'declared',
    )).resolves.toEqual([])
  })
})
