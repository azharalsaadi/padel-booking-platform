import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    globals: false,
    // The default 5000ms starts timing out individually-fast tests once the
    // full suite runs across many parallel workers on constrained hardware
    // (observed: Textarea/ShowcasePage/BookingPage tests that pass in under
    // a second in isolation timing out here) — this is worker contention,
    // not slow tests, so the fix is headroom, not per-test tuning.
    testTimeout: 20000,
  },
})
