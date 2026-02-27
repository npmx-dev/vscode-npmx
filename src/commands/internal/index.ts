import { internalCommands } from '#state'
import { useTextEditorCommands } from 'reactive-vscode'
import { replaceText } from './replace-text'

export function useInternalCommands() {
  useTextEditorCommands({
    [internalCommands.replaceText]: replaceText,
  })
}
