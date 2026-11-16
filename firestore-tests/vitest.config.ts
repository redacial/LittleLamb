import { defineConfig } from 'vitest/config'

// Rules tests talk to the Firestore/Storage emulators over the network, so they run
// serially with a generous timeout. The emulator is started by `firebase emulators:exec`
// (see package.json test script).
export default defineConfig({
  // These are pure node/emulator tests with no stylesheets. Without this, Vite walks UP the
  // tree, finds the repo-root postcss.config.js (which requires `tailwindcss`), and crashes
  // with "Cannot find module 'tailwindcss'". It passes locally only because the hoisted root
  // node_modules has tailwind; on CI this job runs `npm ci --prefix firestore-tests` ONLY, so
  // root node_modules (and tailwind) are absent. An explicit inline postcss config disables
  // the filesystem search entirely — Vite never looks up at the root config.
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    include: ['*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
})
