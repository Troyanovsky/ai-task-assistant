import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: './',
  server: {
    host: true,
    strictPort: true,
    port: 5173
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  optimizeDeps: {
    exclude: ['better-sqlite3']
  },
  // Prevent Vite from attempting to handle Node.js modules
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
