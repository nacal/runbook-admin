#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { createApp } from 'honox/server'
import open from 'open'

const PORT = process.env.PORT || 3000
const HOST = '127.0.0.1'

async function main() {
  console.log('🔥 Starting Runbook Admin...')
  console.log(`📁 Project: ${process.cwd()}`)
  
  try {
    // Create HonoX app
    const app = createApp()
    
    // Start server
    serve({
      fetch: app.fetch,
      port: Number(PORT),
      hostname: HOST
    })

    const url = `http://${HOST}:${PORT}`
    
    console.log(`✨ Server running at ${url}`)
    console.log(`🔍 Scanning for runbooks...`)
    console.log(``)
    console.log(`Press Ctrl+C to stop`)
    
    // Auto-open browser
    setTimeout(async () => {
      try {
        await open(url)
        console.log(`🌐 Opened browser at ${url}`)
      } catch (error) {
        console.log(`💡 Manually open: ${url}`)
      }
    }, 1000)

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down gracefully...')
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      console.log('\n👋 Shutting down gracefully...')
      process.exit(0)
    })

  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Check if runn is available
async function checkRunn() {
  try {
    const { spawn } = await import('child_process')
    return new Promise<boolean>((resolve) => {
      const child = spawn('runn', ['--version'], { stdio: 'pipe' })
      child.on('close', (code) => resolve(code === 0))
      child.on('error', () => resolve(false))
    })
  } catch {
    return false
  }
}

// Main execution
async function init() {
  console.log('🔥 Runbook Admin')
  console.log('================')
  
  // Check if runn is installed
  const hasRunn = await checkRunn()
  if (!hasRunn) {
    console.log('⚠️  Warning: Runn CLI not found in PATH')
    console.log('   Install with: go install github.com/k1LoW/runn/cmd/runn@latest')
    console.log('   Or visit: https://github.com/k1LoW/runn')
    console.log('')
  }
  
  await main()
}

init().catch((error) => {
  console.error('❌ Startup failed:', error)
  process.exit(1)
})