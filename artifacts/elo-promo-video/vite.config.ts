import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, '../../attached_assets')
    },
  },
  server: {
    port: Number(process.env.PORT) || 5000,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    outDir: 'dist/public',
  },
})