import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: false, // Allow Vite to find an available port if 5173 is busy
  },
  build: {
    outDir: 'dist-react',
  }
})
