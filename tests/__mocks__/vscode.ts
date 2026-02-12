import { createVSCodeMock } from 'jest-mock-vscode'
import { vi } from 'vitest'

const vscode = createVSCodeMock(vi)

export const Uri = vscode.Uri
export const workspace = vscode.workspace
export const languages = vscode.languages
export const Range = vscode.Range
export const Position = vscode.Position
export const Location = vscode.Location
export const Selection = vscode.Selection
export const CodeAction = vscode.CodeAction
export const CodeActionKind = vscode.CodeActionKind
export const CodeActionTriggerKind = vscode.CodeActionTriggerKind
export const WorkspaceEdit = vscode.WorkspaceEdit
export const DiagnosticSeverity = vscode.DiagnosticSeverity
export const ThemeColor = vscode.ThemeColor
export const ThemeIcon = vscode.ThemeIcon
export const TreeItem = vscode.TreeItem
export const TreeItemCollapsibleState = vscode.TreeItemCollapsibleState
export const Disposable = vscode.Disposable
export default vscode
