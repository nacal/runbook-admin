import { createRoute } from 'honox/factory'
import { ExecutionOptionsManager } from '../../../../services/execution-options-manager'

// Get specific execution preset
export const GET = createRoute(async (c) => {
  try {
    const name = c.req.param('name')
    const manager = ExecutionOptionsManager.getInstance()
    const preset = await manager.getPreset(name)
    
    if (preset) {
      return c.json({
        success: true,
        data: preset
      })
    } else {
      return c.json({
        success: false,
        error: 'Preset not found'
      }, 404)
    }
  } catch (error) {
    console.error('Failed to get execution preset:', error)
    return c.json({
      success: false,
      error: 'Failed to load execution preset'
    }, 500)
  }
})

// Delete execution preset
export const DELETE = createRoute(async (c) => {
  try {
    const name = c.req.param('name')
    const manager = ExecutionOptionsManager.getInstance()
    const deleted = await manager.deletePreset(name)
    
    if (deleted) {
      return c.json({
        success: true,
        message: `Execution preset '${name}' deleted successfully`
      })
    } else {
      return c.json({
        success: false,
        error: 'Preset not found'
      }, 404)
    }
  } catch (error) {
    console.error('Failed to delete execution preset:', error)
    return c.json({
      success: false,
      error: 'Failed to delete execution preset'
    }, 500)
  }
})