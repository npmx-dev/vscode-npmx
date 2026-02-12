import { PACKAGE_JSON_BASENAME } from '#constants'
import { logger } from '#state'
import { npmxFileUrl } from '#utils/links'
import { findNearestFile, resolvePackageJson } from '#utils/resolve'
import { useActiveTextEditor } from 'reactive-vscode'
import { env, Uri, window } from 'vscode'

export async function openFileInNpmx(fileUri?: Uri) {
  const textEditor = useActiveTextEditor()

  // If triggered from context menu, fileUri is provided.
  // If triggered from command palette, use active text editor.
  const uri = fileUri ?? textEditor.value?.document.uri
  if (!uri) {
    window.showErrorMessage('npmx: No active file selected.')
    return
  }

  // Assert the given file is in `node_modules/`, though the command should
  // already be limited to such files.
  if (!uri.path.includes('/node_modules/')) {
    window.showErrorMessage('npmx: Selected file is not within a node_modules folder.')
    return
  }

  // Find the associated package manifest and the relative path to the given file.
  const pkgJsonUri = await findNearestFile(PACKAGE_JSON_BASENAME, uri, (u) => u.path.endsWith('/node_modules'))
  const manifest = pkgJsonUri ? await resolvePackageJson(pkgJsonUri) : undefined
  if (!pkgJsonUri || !manifest) {
    logger.warn(`Could not resolve npmx url: ${uri.toString()}`)
    window.showWarningMessage(`npmx: Could not find package.json for ${uri.toString()}`)
    return
  }

  const relativePath = uri.path.slice(pkgJsonUri.path.lastIndexOf('/') + 1)
  // Use line number only if the user is actively looking at the relevant file
  const openingActiveFile = !fileUri || fileUri.toString() === textEditor.value?.document.uri.toString()

  // VSCode uses 0-indexed lines, npmx uses 1-indexed lines
  const vsCodeLine = openingActiveFile ? textEditor.value?.selection.active.line : undefined
  const npmxLine = vsCodeLine !== undefined ? vsCodeLine + 1 : undefined

  // Construct the npmx.dev URL and open it.
  const url = npmxFileUrl(manifest.name, manifest.version, relativePath, npmxLine)
  await env.openExternal(Uri.parse(url))
}
