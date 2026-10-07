import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mockApi } from './server/api.ts'

export default defineConfig({
  plugins: [react(), mockApi()],
})
