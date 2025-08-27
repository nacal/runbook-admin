import { defineConfig } from 'vite'
import honox from 'honox/vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  return {
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
      manifest: mode !== 'server',
      ssr: mode === 'server' ? './app/server.ts' : undefined,
      rollupOptions: {
        external: mode === 'server' ? 
          ['fsevents', 'node:path', 'node:url', 'node:fs', 'node:child_process', '@hono/node-server'] : 
          ['fsevents'],
        input: mode === 'server' ? 
          './app/server.ts' : 
          { 
            client: './app/client.ts',
            style: './app/style.css'
          },
        output: {
          format: 'esm'
        }
      }
    }
  }
})