import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types.ts',
  ],
  platform: 'node',
  exports: true,
  dts: true,
  minify: 'dce-only',
})
