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
 * Get environment variables with the original PATH restored
 */
export function getOriginalEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: ORIGINAL_ENV.PATH,
  }
}
