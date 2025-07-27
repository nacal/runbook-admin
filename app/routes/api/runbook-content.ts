import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Hono } from 'hono'
import { ProjectContext } from '../../services/project-context'

const app = new Hono()

// Get runbook content
app.get('/', async (c) => {
  try {
    const path = c.req.query('path')

    if (!path) {
      return c.json(
        {
          success: false,
          error: 'Path is required',
        },
        400,
      )
    }

    const projectPath = ProjectContext.getProjectPath()
    const filePath = join(projectPath, path)

    // Security check - ensure the path is within the project directory
    const normalizedPath = filePath.replace(/\\/g, '/')
    const normalizedCwd = projectPath.replace(/\\/g, '/')

    if (!normalizedPath.startsWith(normalizedCwd)) {
      return c.json(
        {
          success: false,
          error: 'Invalid path',
        },
        403,
      )
    }

    if (!existsSync(filePath)) {
      console.error('Runbook not found:', filePath)
      return c.json(
        {
          success: false,
          error: 'Runbook not found',
        },
        404,
      )
    }

    const content = await readFile(filePath, 'utf-8')

    return c.json({
      success: true,
      data: {
        path,
        content,
        size: content.length,
        lines: content.split('\n').length,
      },
    })
  } catch (error) {
    console.error('Failed to read runbook:', error)
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to read runbook',
      },
      500,
    )
  }
})

export default app
