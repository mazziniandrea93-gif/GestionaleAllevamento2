import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 3000,
  },
  // Gestione SPA routing - fallback a index.html per tutte le route
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
