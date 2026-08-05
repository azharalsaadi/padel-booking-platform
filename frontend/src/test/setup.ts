import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import '@/i18n/config'

// globals: false in vitest.config.ts means Testing Library can't
// auto-detect a global afterEach to run its cleanup — so it's wired up
// explicitly here instead, once, for every test file.
afterEach(() => {
  cleanup()
})
