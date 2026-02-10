import { Uri, workspace } from 'vscode'

/**
 * Resolves the relative path of a file within its package.
 *
 * @param uri The URI of the file to resolve.
 * @returns A promise that resolves to the package manifest and relative path,
 *     or `undefined` if not found.
 */
export async function resolvePackageRelativePath(uri: Uri): Promise<{ manifest: PackageManifest, relativePath: string } | undefined> {
  const result = await findPackageJson(uri)
  if (!result)
    return undefined

  const { uri: pkgUri, manifest } = result
  const relativePath = uri.path.slice(pkgUri.path.lastIndexOf('/') + 1)

  return { manifest, relativePath }
}

/** A parsed `package.json` manifest file. */
interface PackageManifest {
  /** Package name. */
  name: string

  /** Package version specifier. */
  version: string
}

/**
 * Finds the nearest package.json file by searching upwards from the given URI.
 *
 * @param file The URI to start the search from.
 * @returns The URI and parsed content of the package.json, or `undefined` if
 *     not found.
 */
async function findPackageJson(file: Uri): Promise<{ uri: Uri, manifest: PackageManifest } | undefined> {
  // Start from the directory, so we don't look for
  // `node_modules/foo/bar.js/package.json`
  const startDir = Uri.joinPath(file, '..')

  for (const dir of walkAncestors(startDir)) {
    const pkgUri = Uri.joinPath(dir, 'package.json')

    let pkg: Partial<PackageManifest> | undefined
    try {
      const content = await workspace.fs.readFile(pkgUri)
      pkg = JSON.parse(new TextDecoder().decode(content)) as Partial<PackageManifest>
    } catch {
      continue
    }

    if (isValidManifest(pkg)) {
      return {
        uri: pkgUri,
        manifest: pkg,
      }
    }
  }

  return undefined
}

function* walkAncestors(start: Uri): Generator<Uri, void, void> {
  let currentUri = start
  while (true) {
    yield currentUri

    if (currentUri.path.endsWith('/node_modules'))
      return

    const parentUri = Uri.joinPath(currentUri, '..')
    if (parentUri.toString() === currentUri.toString())
      return

    currentUri = parentUri
  }
}

/**
 * Check for valid package manifest, as it might be a manifest which just
 * configures a setting without really being a package (such as
 * `{sideEffects: false}`).
 */
function isValidManifest(json: Partial<PackageManifest>): json is PackageManifest {
  return Boolean(json && json.name && json.version)
}
