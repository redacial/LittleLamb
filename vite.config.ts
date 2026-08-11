/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Two build targets share one config, selected via the BUILD_TARGET env var:
//   - default              → the full app (index.html → src/main.tsx) → dist/
//   - BUILD_TARGET=landing → the standalone PRE-LAUNCH landing site only
//       (landing.html → src/landing/main.tsx) → dist-landing/. This is what gets deployed to
//       littlelambnannies.com before launch. It contains NO app code (no router, no auth), so
//       the unfinished app is not reachable from the public URL. The npm build:landing script
//       renames the emitted landing.html → index.html for hosting.
// https://vitejs.dev/config/
export default defineConfig(() => {
  const isLanding = process.env.BUILD_TARGET === 'landing'

  return {
    plugins: [react()],
    server: {
      port: 5180,
      strictPort: true,
    },
    build: {
      // Landing target overrides the output location and entry; the app target uses defaults
      // (dist/, index.html). Both share the manualChunks strategy below.
      ...(isLanding && { outDir: 'dist-landing', emptyOutDir: true }),
      rollupOptions: {
        ...(isLanding && { input: resolve(__dirname, 'landing.html') }),
        output: {
          // Split long-lived vendor code out of the app chunk. These libraries change far
          // less often than our own source, so giving them their own hashed files means a
          // deploy of app code doesn't invalidate the visitor's cached copy of React or the
          // Firebase SDK. NOTE: on a cold first paint this does NOT reduce total bytes for
          // whatever the entry actually imports — it redistributes them across files.
          manualChunks: {
            react: ['react', 'react-dom'],
            firebase: ['firebase/app', 'firebase/firestore'],
            motion: ['framer-motion'],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: false,
      // src/lib/firebase.ts calls requireEnv() at MODULE scope and throws when a var is
      // missing, so any test that transitively imports it dies at collection time — not as
      // a failed assertion, but as an uncollectable file. .env is gitignored, so this makes
      // the suite pass locally and fail on any clean checkout, CI included.
      //
      // These values are dummies: they are never sent anywhere. No test touches a real
      // Firebase backend, and initializeApp() does not validate them or open a connection.
      // Copying .env.example is NOT an alternative — its values are empty strings, which
      // requireEnv rejects (`if (!value)`).
      env: {
        VITE_FIREBASE_API_KEY: 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'test-project',
        VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
        VITE_FIREBASE_APP_ID: '1:000000000000:web:testappid',
      },
      // Client tests only. The functions/ package has its own Node-environment
      // Vitest run (npm --prefix functions test) — don't pull its specs into jsdom.
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      exclude: ['functions/**', 'node_modules/**', 'dist/**', 'dist-landing/**'],
    },
  }
})
