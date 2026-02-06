import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Shri-Ashtalakshmi-Electricals',
  define: {
    'import.meta.env.VITE_GOOGLE_SCRIPT_URL': JSON.stringify(process.env.VITE_GOOGLE_SCRIPT_URL)
  }
})
