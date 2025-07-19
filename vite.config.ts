import { defineConfig } from 'vite'
import honox from 'honox/vite'

export default defineConfig({
  plugins: [honox()],
  server: {
    host: true,
    port: 3000
  }
})