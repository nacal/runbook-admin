import { createRoute } from 'honox/factory'
import { RunnExecutor } from '../../lib/runn'
import { ExecutionManager } from '../../lib/execution-manager'

export const POST = createRoute(async (c) => {
  try {
    const { runbookPath, variables = {} } = await c.req.json()

    if (!runbookPath) {
      return c.json({
        success: false,
        error: 'runbookPath is required'
      }, 400)
    }

    // Check if runn is available
    const isRunnAvailable = await RunnExecutor.checkRunnAvailable()
    if (!isRunnAvailable) {
      return c.json({
        success: false,
        error: 'Runn CLI is not installed or not available in PATH. Please install runn: go install github.com/k1LoW/runn/cmd/runn@latest'
      }, 400)
    }

    const manager = ExecutionManager.getInstance()
    const executionId = await manager.startExecution(runbookPath, variables)

    return c.json({
      success: true,
      executionId,
      message: 'Execution started'
    })

  } catch (error) {
    console.error('Execution error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Simple status endpoint
export const GET = createRoute(async (c) => {
  const isRunnAvailable = await RunnExecutor.checkRunnAvailable()
  
  return c.json({
    success: true,
    runnAvailable: isRunnAvailable,
    status: 'ready'
  })
})