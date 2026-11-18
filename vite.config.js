import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import jps from './api/jps.js'

// In production /api/jps is a Vercel function. During `npm run dev` this
// plugin serves the same handler so live mode works locally too.
const devApi = {
  name: 'dev-api',
  configureServer(server) {
    server.middlewares.use('/api/jps', (req, res) => jps(req, res))
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi],
})
