import { createRoute } from 'honox/factory'
import { ExecutionManager } from '../../../services/execution-manager'

// Get specific execution status
export const GET = createRoute(async (c) => {
  try {
    const executionId = c.req.param('id')

    if (!executionId) {
      return c.json(
        {
          success: false,
          error: 'Execution ID is required',
        },
        400,
      )
    }

    const manager = ExecutionManager.getInstance()
    const execution = manager.getExecution(executionId)

    if (!execution) {
      return c.json(
        {
          success: false,
          error: 'Execution not found',
        },
        404,
      )
    }

    // Return execution directly for easier consumption by client
    return c.json(execution)
  } catch (error) {
    console.error('Error fetching execution:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

// Stop execution
export const DELETE = createRoute(async (c) => {
  try {
    const executionId = c.req.param('id')

    if (!executionId) {
      return c.json(
        {
          success: false,
          error: 'Execution ID is required',
        },
        400,
      )
    }

    const manager = ExecutionManager.getInstance()
    const stopped = manager.stopExecution(executionId)

    if (!stopped) {
      return c.json(
        {
          success: false,
          error: 'Execution not found or not running',
        },
        404,
      )
    }

    return c.json({
      success: true,
      message: 'Execution stopped',
    })
  } catch (error) {
    console.error('Error stopping execution:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})
