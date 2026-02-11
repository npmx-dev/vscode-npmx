import { createVSCodeMock } from 'jest-mock-vscode'
import { vi } from 'vitest'

const vscode = createVSCodeMock(vi)

export const {
  Uri,
  workspace,
  Range,
  Position,
  Location,
  Selection,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Disposable,
  MarkdownString,
  CompletionItem,
  CompletionItemKind,
  CodeAction,
  CodeActionKind,
  WorkspaceEdit,
  DiagnosticSeverity,
  DiagnosticTag,
  window,
  languages,
} = vscode

export default vscode
