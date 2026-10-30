import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.BACKEND_URL || 'http://localhost:4000'
  return {
    plugins: [react()],
    // Forward /api calls to the Express backend so the browser sees one origin (no CORS issues).
    server: { port: 5173, open: true, proxy: { '/api': { target: backend, changeOrigin: true } } },
  }
})
