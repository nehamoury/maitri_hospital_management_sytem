import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|react-helmet-async|@remix-run)/, priority: 3 },
            { name: 'charts', test: /node_modules[\\/](recharts|victory|d3-|@types[\\/]d3|@reduxjs[\\/]toolkit)/, priority: 2 },
            { name: 'ui-vendor', test: /node_modules[\\/](framer-motion|lucide-react|axios|sonner|class-variance-authority|clsx|tailwind-merge|tw-animate-css|@radix-ui|@floating-ui)/, priority: 2 },
            { name: 'vendor', test: /node_modules/, priority: 1 },
          ],
        },
      },
    },
  },
})

