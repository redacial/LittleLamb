import { defineConfig } from 'vitest/config'

// Rules tests talk to the Firestore/Storage emulators over the network, so they run
// serially with a generous timeout. The emulator is started by `firebase emulators:exec`
// (see package.json test script).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
})
