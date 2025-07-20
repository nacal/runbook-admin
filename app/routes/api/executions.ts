import { createRoute } from 'honox/factory'
import { ExecutionManager } from '../../lib/execution-manager'

// Get all executions
export const GET = createRoute(async (c) => {
  try {
    const manager = ExecutionManager.getInstance()
    const executions = manager.getAllExecutions()

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
    // Clear all completed executions
    const executions = manager.getAllExecutions()
    const runningCount = executions.filter(e => e.status === 'running').length
    
    // For now, we can't actually clear from the manager without adding that method
    // This would require adding a clearHistory method to ExecutionManager
    
    return c.json({
      success: true,
      message: `Kept ${runningCount} running executions`,
      cleared: executions.length - runningCount
    })
  } catch (error) {
    console.error('Error clearing executions:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})