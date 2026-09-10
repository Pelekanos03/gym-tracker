import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the NestJS backend so the frontend can just call "/api/...".
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
