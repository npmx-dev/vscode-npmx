import { PACKAGE_JSON_BASENAME } from '#constants'
import { logger } from '#state'
import { npmxFileUrl } from '#utils/links'
import { findNearestFile, resolvePackageJson } from '#utils/resolve'
import { env, Uri, window } from 'vscode'

export async function openFileInNpmx(fileUri?: Uri) {
  const textEditor = window.activeTextEditor

  // If triggered from context menu, fileUri is provided.
  // If triggered from command palette, use active text editor.
  const uri = fileUri ?? textEditor?.document.uri
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
  const openingActiveFile = !fileUri || fileUri.toString() === textEditor?.document.uri.toString()

  // Construct the npmx.dev URL and open it. VSCode uses 0-indexed lines, npmx uses 1-indexed.
  const { selection } = textEditor ?? {}
  const url = npmxFileUrl(
    manifest.name,
    manifest.version,
    relativePath,
    openingActiveFile && selection ? selection.start.line + 1 : undefined,
    openingActiveFile && selection ? selection.end.line + 1 : undefined,
  )
  await env.openExternal(Uri.parse(url))
}
