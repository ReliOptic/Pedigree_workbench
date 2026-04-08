import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

/**
 * Vite configuration for the Pedigree Workbench desktop bundle.
 *
 * - `base: './'` is mandatory for Tauri (loads the bundled app via `file://`).
 * - No runtime secrets are injected — the app is fully offline.
 * - HMR is gated by `DISABLE_HMR` so headless agents can edit files without flicker.
 */
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
}));
