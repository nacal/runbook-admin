#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { platform } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import open from 'open'

const PORT = process.env.PORT || 3444
const HOST = '127.0.0.1'

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const appRoot = join(__dirname, '..') // dist/bin -> dist

// Enhance PATH for different platforms
function enhancePath(currentPath: string | undefined): string {
  const isWindows = platform() === 'win32'
  const separator = isWindows ? ';' : ':'
  const basePath = currentPath || ''

  if (isWindows) {
    // Windows-specific paths
    const windowsPaths = [
      process.env.USERPROFILE ? `${process.env.USERPROFILE}\\go\\bin` : '',
      process.env.GOPATH ? `${process.env.GOPATH}\\bin` : '',
      process.env.GOBIN || '',
      'C:\\Program Files\\Go\\bin',
      'C:\\go\\bin',
    ].filter(Boolean)

    // Check if Go paths are already in PATH
    const needsGoPath = !windowsPaths.some((p) =>
      basePath.toLowerCase().includes(p.toLowerCase()),
    )

    if (needsGoPath && windowsPaths.length > 0) {
      return `${basePath}${separator}${windowsPaths.join(separator)}`
    }
    return basePath
  } else {
    // Unix-like paths
    const unixPaths = [
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/local/go/bin',
      process.env.HOME ? `${process.env.HOME}/go/bin` : '',
    ].filter(Boolean)

    return `${basePath}${separator}${unixPaths.join(separator)}`
  }
}

async function main() {
  // Get project path from command line argument or current working directory
  const args = process.argv.slice(2)
  const projectPath = args[0] || process.cwd()

  console.log('🔥 Starting Runbook Admin...')
  console.log(`📁 Project: ${projectPath}`)

  try {
    // Run the built production server
    const serverScript = join(appRoot, 'server-entry.js')
    const serverProcess = spawn('node', [serverScript], {
      cwd: appRoot,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PROJECT_PATH: projectPath,
        PORT: String(PORT),
        HOST: HOST,
        // Ensure common paths are included for runn command
        PATH: enhancePath(process.env.PATH),
      },
    })

    let serverStarted = false
    const url = `http://${HOST}:${PORT}`

    // Listen for server startup
    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data) => {
        const output = data.toString()

        // Filter out duplicate server startup messages but keep debug logs
        const lines = output.split('\n')
        const filteredLines = lines.filter((line: string) => {
          const trimmed = line.trim()
          // Skip duplicate startup messages
          if (
            trimmed.includes('🔥 Starting Runbook Admin Server') ||
            trimmed.includes('📁 Project:') ||
            trimmed.includes('✨ Server running at')
          ) {
            return false
          }
          return trimmed.length > 0
        })

        // Log filtered output
        if (filteredLines.length > 0) {
          process.stdout.write(`${filteredLines.join('\n')}\n`)
        }

        if (
          !serverStarted &&
          (output.includes('Server running at') ||
            output.includes('Starting Runbook Admin Server'))
        ) {
          serverStarted = true
        }
      })
    }

    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        console.error(data.toString())
      })
    }

    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error)
      process.exit(1)
    })

    serverProcess.on('close', (code) => {
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
      serverProcess.kill('SIGTERM')
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
        env: {
          ...process.env,
          PATH: enhancePath(process.env.PATH),
        },
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
