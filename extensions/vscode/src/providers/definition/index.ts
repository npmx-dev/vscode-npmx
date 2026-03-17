import { PACKAGE_JSON_PATTERN } from '#utils/constants'
import { useDisposable } from 'reactive-vscode'
import { languages } from 'vscode'
import { CatalogDefinitionProvider } from './catalog'

export function useDefinition() {
  useDisposable(
    languages.registerDefinitionProvider({ pattern: PACKAGE_JSON_PATTERN }, new CatalogDefinitionProvider()),
  )
}
