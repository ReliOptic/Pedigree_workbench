import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration.
 *
 * `fake-indexeddb/auto` is registered in `tests/setup.ts` so service tests can
 * exercise the real `idb` library against an in-memory IndexedDB.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/services/**', 'src/hooks/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
