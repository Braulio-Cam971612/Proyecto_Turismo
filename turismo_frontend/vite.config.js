import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// El frontend corre en http://localhost:5173 (origen autorizado en CORS_ALLOWED_ORIGINS del backend)
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
