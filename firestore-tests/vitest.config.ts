import { defineConfig } from 'vitest/config'

// Rules tests talk to the Firestore/Storage emulators over the network, so they run
// serially with a generous timeout. The emulator is started by `firebase emulators:exec`
// (see package.json test script).
export default defineConfig({
  // These are pure node/emulator tests with no stylesheets. Without this, Vitest walks UP
  // the tree, finds the repo-root postcss.config.js (which requires `tailwindcss`), and
  // crashes with "Cannot find module 'tailwindcss'" — firestore-tests/node_modules has no
  // tailwind. Disabling CSS processing skips the PostCSS config search entirely.
  css: false,
  test: {
    environment: 'node',
    include: ['*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
})
