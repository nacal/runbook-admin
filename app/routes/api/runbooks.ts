import { createRoute } from 'honox/factory'
import { FileScanner } from '../../services/file-scanner'
import { getProjectPath } from '../../utils/project-context'

export const GET = createRoute(async (c) => {
  try {
    const projectPath = c.req.query('path') || getProjectPath()
    const scanner = new FileScanner(projectPath)
    const runbooks = await scanner.scanRunbooks()

    return c.json({
      success: true,
      data: runbooks,
      count: runbooks.length,
      projectPath,
    })
  } catch (error) {
    console.error('Error scanning runbooks:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
        count: 0,
      },
      500,
    )
  }
})
