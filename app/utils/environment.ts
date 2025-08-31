import { existsSync } from 'node:fs'
import { platform } from 'node:os'
import { join } from 'node:path'

/**
 * Original environment variables preserved at startup
 *
 * This is necessary because npx modifies the PATH environment variable
 * by prepending its own node_modules paths, which can break external
 * command discovery (like 'runn', 'git', etc.).
 *
 * By capturing the original environment at module load time,
 * we can restore the proper PATH when needed.
 */
export const ORIGINAL_ENV = { ...process.env }

/**
 * Check if PATH has been truncated by npx on Windows
 */
function isPathTruncated(path: string | undefined): boolean {
  if (!path) return true

  // npx truncates PATH on Windows, usually ending with "..." or being abnormally short
  if (platform() === 'win32') {
    return path.endsWith('...') || path.endsWith('C:') || path.length < 500
  }

  return false
}

/**
 * Get common Go binary paths for Windows
 */
function getWindowsGoPaths(): string[] {
  const paths: string[] = []
  const userProfile = process.env.USERPROFILE || process.env.HOME

  if (userProfile) {
    paths.push(join(userProfile, 'go', 'bin'))
  }

  if (process.env.GOPATH) {
    paths.push(join(process.env.GOPATH, 'bin'))
  }

  if (process.env.GOBIN) {
    paths.push(process.env.GOBIN)
  }

  // Common Go installation paths on Windows
  paths.push('C:\\Program Files\\Go\\bin')
  paths.push('C:\\go\\bin')

  // Filter out non-existent paths
  return paths.filter((p) => existsSync(p))
}

/**
 * Get environment variables with the original PATH restored
 */
export function getOriginalEnvironment(): NodeJS.ProcessEnv {
  let path = ORIGINAL_ENV.PATH

  // On Windows, if PATH is truncated, try to restore it
  if (platform() === 'win32' && isPathTruncated(path)) {
    console.log('Detected truncated PATH on Windows, attempting to restore...')

    // Start with the truncated PATH (it contains npx paths we need)
    const basePath = path || ''

    // Add common Go paths that might have been truncated
    const goPaths = getWindowsGoPaths()

    if (goPaths.length > 0) {
      const separator = platform() === 'win32' ? ';' : ':'
      path = `${basePath}${separator}${goPaths.join(separator)}`
      console.log(`Added Go paths: ${goPaths.join(', ')}`)
    }
  }

  return {
    ...process.env,
    PATH: path,
  }
}
