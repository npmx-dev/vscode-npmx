import { PACKAGE_JSON_BASENAME } from '#shared/constants'
import { useDisposable } from 'reactive-vscode'
import { languages } from 'vscode'
import { CatalogDefinitionProvider } from './catalog'

export function useDefinition() {
  useDisposable(
    languages.registerDefinitionProvider({ pattern: `**/${PACKAGE_JSON_BASENAME}` }, new CatalogDefinitionProvider()),
  )
}
