import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts', './src/test/global-mocks.ts'],
    // First test in each suite pays a module-transform cost; 20s is enough
    // headroom while still catching genuinely hung tests.
    testTimeout: 20000,
    hookTimeout: 15000,
    pool: 'forks',
  },
})
