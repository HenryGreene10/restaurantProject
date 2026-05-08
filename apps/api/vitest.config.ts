import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts', './src/test/global-mocks.ts'],
    testTimeout: 10000,
    hookTimeout: 35000,
    pool: 'threads',
    // Run test files sequentially — parallel workers race to transform app.ts
    // and deadlock under WSL2, causing random beforeAll timeouts.
    fileParallelism: false,
  },
})
