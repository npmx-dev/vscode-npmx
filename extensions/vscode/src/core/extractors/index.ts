import { extname } from 'pathe'
import { JsonExtractor } from './json'
import { YamlExtractor } from './yaml'

const jsonExtractor = new JsonExtractor()
const yamlExtractor = new YamlExtractor()

const extractorsByExtension = {
  '.json': jsonExtractor,
  '.yaml': yamlExtractor,
  '.yml': yamlExtractor,
} as const satisfies Record<string, JsonExtractor | YamlExtractor>

type ExtractorByExt<T extends string>
  = T extends `${string}.json` ? JsonExtractor
  : T extends `${string}.yaml` | `${string}.yml` ? YamlExtractor
  : JsonExtractor | YamlExtractor | undefined

export function getExtractor<T extends string>(filename: T): ExtractorByExt<T> {
  return extractorsByExtension[extname(filename) as keyof typeof extractorsByExtension] as ExtractorByExt<T>
}
