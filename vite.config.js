import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/cra-assessment/',
  build: {
    outDir: 'dist',
    minify: 'esbuild',
  },
})
