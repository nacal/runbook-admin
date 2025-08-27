#!/usr/bin/env node

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import the built server bundle
const serverModule = await import(join(__dirname, 'server.js'))
const app = serverModule.default

// Serve static assets from dist/assets
app.use(
  '/assets/*',
  serveStatic({
    root: join(__dirname, 'assets'),
    rewriteRequestPath: (path) => path.replace(/^\/assets/, ''),
  }),
)

const PORT = process.env.PORT || 3444
const HOST = process.env.HOST || '127.0.0.1'

console.log(`🔥 Starting Runbook Admin Server...`)
console.log(`📁 Project: ${process.env.PROJECT_PATH || process.cwd()}`)

serve(
  {
    fetch: app.fetch,
    port: parseInt(String(PORT)),
    hostname: HOST,
  },
  (info) => {
    console.log(`✨ Server running at http://${info.address}:${info.port}`)
  },
)
