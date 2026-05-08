import { readFileSync, writeFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const version = packageJson.version

const zedExtensionTomlUrl = new URL('../extensions/zed/extension.toml', import.meta.url)
const zedCargoTomlUrl = new URL('../extensions/zed/Cargo.toml', import.meta.url)

const zedExtensionToml = readFileSync(zedExtensionTomlUrl, 'utf8')
const nextZedExtensionToml = zedExtensionToml.replace(
  /^version = ".*"$/m,
  `version = "${version}"`,
)

if (nextZedExtensionToml !== zedExtensionToml)
  writeFileSync(zedExtensionTomlUrl, nextZedExtensionToml)

const zedCargoToml = readFileSync(zedCargoTomlUrl, 'utf8')
const nextZedCargoToml = zedCargoToml.replace(
  /^version = ".*"$/m,
  `version = "${version}"`,
)

if (nextZedCargoToml !== zedCargoToml)
  writeFileSync(zedCargoTomlUrl, nextZedCargoToml)
