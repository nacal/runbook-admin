#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import open from 'open'

const PORT = process.env.PORT || 3444
const HOST = '127.0.0.1'

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const appRoot = join(__dirname, '..', '..')

async function main() {
  // Get project path from command line argument or current working directory
  const args = process.argv.slice(2)
  const projectPath = args[0] || process.cwd()

  console.log('🔥 Starting Runbook Admin...')
  console.log(`📁 Project: ${projectPath}`)

  try {
    // Use npx to run vite dev for development mode
    const viteCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
    const viteProcess = spawn(
      viteCommand,
      ['vite', 'dev', '--host', HOST, '--port', String(PORT)],
      {
        cwd: appRoot,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'development',
          PROJECT_PATH: projectPath,
          // Ensure common paths are included for runn command
          PATH:
            process.env.PATH +
            ':/opt/homebrew/bin:/usr/local/bin:/usr/local/go/bin',
        },
        shell: process.platform === 'win32',
      },
    )

    let serverStarted = false
    const url = `http://${HOST}:${PORT}`

    // Listen for server startup
    if (viteProcess.stdout) {
      viteProcess.stdout.on('data', (data) => {
        const output = data.toString()

        // Log all vite output to see runn execution logs
        process.stdout.write(output)

        if (
          !serverStarted &&
          (output.includes('ready in') || output.includes('Local:'))
        ) {
          serverStarted = true
        }
      })
    }

    if (viteProcess.stderr) {
      viteProcess.stderr.on('data', (data) => {
        console.error(data.toString())
      })
    }

    viteProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error)
      process.exit(1)
    })

    viteProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`Server process exited with code ${code}`)
        process.exit(code)
      }
    })

    console.log(`✨ Server running at ${url}`)
    console.log(`🔍 Scanning for runbooks...`)
    console.log(``)
    console.log(`Press Ctrl+C to stop`)

    // Auto-open browser after server starts
    setTimeout(async () => {
      try {
        await open(url)
        console.log(`🌐 Opened browser at ${url}`)
      } catch (_error) {
        console.log(`💡 Manually open: ${url}`)
      }
    }, 3000)

    // Handle graceful shutdown
    const shutdown = () => {
      console.log('\n👋 Shutting down gracefully...')
      viteProcess.kill('SIGTERM')
      setTimeout(() => process.exit(0), 1000)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Check if runn is available
async function checkRunn() {
  try {
    const { spawn } = await import('node:child_process')
    return new Promise<boolean>((resolve) => {
      const child = spawn('runn', ['--version'], {
        stdio: 'pipe',
        shell: process.platform === 'win32',
      })
      child.on('close', (code) => resolve(code === 0))
      child.on('error', () => resolve(false))
    })
  } catch {
    return false
  }
}

// Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version
  const majorVersion = Number.parseInt(nodeVersion.split('.')[0].substring(1))
  const minorVersion = Number.parseInt(nodeVersion.split('.')[1])

  // Require Node.js 21.7.0 or later
  if (majorVersion < 21 || (majorVersion === 21 && minorVersion < 7)) {
    console.error('❌ Node.js version 21.7.0 or later is required')
    console.error(`   Current version: ${nodeVersion}`)
    console.error('   Please update Node.js to version 21.7.0 or later')
    console.error('   Visit: https://nodejs.org/')
    process.exit(1)
  }
}

// Main execution
async function init() {
  console.log('🔥 Runbook Admin')
  console.log('================')

  // Check Node.js version first
  checkNodeVersion()

  // Check if runn is installed
  const hasRunn = await checkRunn()
  if (!hasRunn) {
    console.log('⚠️  Warning: Runn CLI not found in PATH')
    console.log(
      '   Install with: go install github.com/k1LoW/runn/cmd/runn@latest',
    )
    console.log('   Or visit: https://github.com/k1LoW/runn')
    console.log('')
  } else {
    console.log('✅ Runn CLI found')
  }

  await main()
}

init().catch((error) => {
  console.error('❌ Startup failed:', error)
  process.exit(1)
})
