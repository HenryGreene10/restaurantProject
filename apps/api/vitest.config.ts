import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts', './src/test/global-mocks.ts'],
    // beforeAll pays the module-transform cost once per suite; 35s covers that.
    // Individual tests run fast after the cache is warm.
    testTimeout: 10000,
    hookTimeout: 35000,
    pool: 'threads',
  },
})
