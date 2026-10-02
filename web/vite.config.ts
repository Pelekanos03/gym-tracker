import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Every production build gets a version (its build time). It's baked into
 * the app as __APP_VERSION__ and also written to /version.json, which the
 * running app polls: when the two differ, a newer build is live and the
 * app offers to update (see UpdateBanner).
 */
const version = new Date().toISOString()

function versionFile(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), versionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(command === 'build' ? version : 'dev'),
  },
  server: {
    port: 5173,
    // Proxy API calls to the NestJS backend so the frontend can just call "/api/...".
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
}))
