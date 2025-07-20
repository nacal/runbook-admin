import { defineConfig } from 'vite'
import honox from 'honox/vite'

export default defineConfig({
  plugins: [honox({
    client: {
      input: ['/app/client.ts']
    }
  })],
  server: {
    host: true,
    port: 3000
  },
  ssr: {
    noExternal: /^(?!.*fsevents)/
  },
  build: {
    rollupOptions: {
      external: ['fsevents']
    }
  }
})