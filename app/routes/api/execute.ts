import { createRoute } from 'honox/factory'
import { RunnExecutor } from '../../lib/runn'

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
        error: 'Runn CLI is not installed or not available in PATH'
      }, 400)
    }

    const executor = new RunnExecutor()
    
    // Start execution
    const executionPromise = executor.execute(runbookPath, variables)
    
    // Return immediately with execution ID
    const executionId = Math.random().toString(36).substring(2, 10)
    
    // Handle execution in background
    executionPromise
      .then(() => {
        console.log(`Execution ${executionId} completed successfully`)
      })
      .catch((error) => {
        console.error(`Execution ${executionId} failed:`, error.message)
      })

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