import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '', [])
  return {
    plugins: [react()],
    base: env.VITE_BASE_URL || '/',
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:3001',
        '/socket.io': {
          target: 'http://localhost:3001',
          ws: true
        }
      }
    }
  }
})