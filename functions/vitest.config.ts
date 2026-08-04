import { defineConfig } from 'vitest/config'

// Functions run in a Node environment (no jsdom). Pure modules (ical, templates,
// billing math, recipient resolution, recurring exec) unit-test here without the
// emulator or any network — that is the bulk of "green-now" coverage.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
