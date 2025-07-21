import { createRoute } from 'honox/factory'
import { ExecutionManager } from '../../services/execution-manager'

// Get all executions
export const GET = createRoute(async (c) => {
  try {
    const manager = ExecutionManager.getInstance()
    const executions = await manager.getAllExecutions()

    return c.json({
      success: true,
      data: executions,
      count: executions.length
    })
  } catch (error) {
    console.error('Error fetching executions:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
      count: 0
    }, 500)
  }
})

// Delete all executions (clear history)
export const DELETE = createRoute(async (c) => {
  try {
    const manager = ExecutionManager.getInstance()
    const executions = await manager.getAllExecutions()
    const totalCount = executions.length
    const runningCount = executions.filter(e => e.status === 'running').length
    
    await manager.clearHistory()
    
    return c.json({
      success: true,
      message: `Cleared ${totalCount - runningCount} completed executions. ${runningCount} running executions were preserved.`,
      cleared: totalCount - runningCount
    })
  } catch (error) {
    console.error('Error clearing executions:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})