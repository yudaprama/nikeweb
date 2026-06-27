import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // The Oathkeeper edge CORS allowlist (oathkeeper.yaml) only permits
  // http://localhost:3010 for dev, and credentialed (cookie) requests can't use
  // a wildcard origin — so pin the dev server to that port.
  server: { port: 3010, strictPort: true },
})
