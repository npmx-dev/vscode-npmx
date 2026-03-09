import type { PackageManager } from '#types/context'
import type { WorkspaceFolder } from 'vscode'
import { PACKAGE_JSON_BASENAME, PNPM_WORKSPACE_BASENAME, YARN_WORKSPACE_BASENAME } from '#constants'
import { Uri } from 'vscode'
import { accessOk } from 'vscode-find-up'
import { readPackageManifest } from './file'
import { parsePackageId } from './package'

export const workspaceFileMapping: Record<Exclude<PackageManager, 'npm'>, string> = {
  pnpm: PNPM_WORKSPACE_BASENAME,
  yarn: YARN_WORKSPACE_BASENAME,
}

export async function detectPackageManager(folder: WorkspaceFolder): Promise<PackageManager> {
  const rootPackageUri = Uri.joinPath(folder.uri, PACKAGE_JSON_BASENAME)

  if (await accessOk(rootPackageUri)) {
    const rootPackage = await readPackageManifest(rootPackageUri)
    if (rootPackage?.packageManager) {
      const { name: packageManager } = parsePackageId(rootPackage.packageManager)
      if (packageManager)
        return packageManager as PackageManager
    }
  }

  for (const [packageManager, basename] of Object.entries(workspaceFileMapping)) {
    if (await accessOk(Uri.joinPath(folder.uri, basename)))
      return packageManager as PackageManager
  }

  return 'npm'
}
