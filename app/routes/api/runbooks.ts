import { createRoute } from 'honox/factory'
import { RunbookScanner } from '../../lib/scanner'

export const GET = createRoute(async (c) => {
  try {
    const projectPath = c.req.query('path') || process.cwd()
    const scanner = new RunbookScanner(projectPath)
    const runbooks = await scanner.scanRunbooks()
    
    return c.json({
      success: true,
      data: runbooks,
      count: runbooks.length,
      projectPath
    })
  } catch (error) {
    console.error('Error scanning runbooks:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
      count: 0
    }, 500)
  }
})