import { readFileSync, writeFileSync } from 'node:fs'
import { styleText } from 'node:util'
import pkgJson from '../package.json' with { type: 'json' }

const { version } = pkgJson
const root = new URL('..', import.meta.url)
const zedExtensionTomlUrl = new URL('extensions/zed/extension.toml', root)
const zedCargoTomlUrl = new URL('extensions/zed/Cargo.toml', root)

const info = (msg: string) => console.log(styleText('blue', 'ℹ'), msg)
const success = (msg: string) => console.log(styleText('green', '✔'), msg)

info(`Syncing zed version to ${version}`)

const zedExtensionToml = readFileSync(zedExtensionTomlUrl, 'utf8')
const nextZedExtensionToml = zedExtensionToml.replace(
  /^version = ".*"$/m,
  `version = "${version}"`,
)

if (nextZedExtensionToml !== zedExtensionToml) {
  writeFileSync(zedExtensionTomlUrl, nextZedExtensionToml)
  info('Updated extension.toml')
}

const zedCargoToml = readFileSync(zedCargoTomlUrl, 'utf8')
const nextZedCargoToml = zedCargoToml.replace(
  /^version = ".*"$/m,
  `version = "${version}"`,
)

if (nextZedCargoToml !== zedCargoToml) {
  writeFileSync(zedCargoTomlUrl, nextZedCargoToml)
  info('Updated Cargo.toml')
}

if (
  nextZedExtensionToml !== zedExtensionToml
  || nextZedCargoToml !== zedCargoToml
) {
  success('Synced')
}
