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
    ...(isLanding && {
      build: {
        outDir: 'dist-landing',
        emptyOutDir: true,
        rollupOptions: {
          input: resolve(__dirname, 'landing.html'),
        },
      },
    }),
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: false,
    },
  }
})
