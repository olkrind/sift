import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Относительный base: сборка работает по адресу /sift/ на GitHub Pages и не зависит от имени репозитория
export default defineConfig({
  base: './',
  plugins: [react()],
})
