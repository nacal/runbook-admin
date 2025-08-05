import { defineConfig } from 'vite'
import honox from 'honox/vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    honox(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app')
    }
  },
  server: {
    host: true,
    port: 3000
  },
  ssr: {
    noExternal: /^(?!.*fsevents)/
  },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      external: ['fsevents'],
      input: {
        client: './app/client.ts'
      }
    }
  }
})