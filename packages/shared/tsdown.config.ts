import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/**/*.ts',
  platform: 'neutral',
  exports: {
    packageJson: false,
  },
  dts: true,
})
