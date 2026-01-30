import { ofetch } from 'ofetch'

const NPM_REGISTRY = 'https://registry.npmjs.org'

export const fetchNpm = ofetch.create({
  baseURL: NPM_REGISTRY,
})
