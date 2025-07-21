import { createRoute } from 'honox/factory'
import { ExecutionOptionsManager } from '../../../services/execution-options-manager'

// Get all execution presets
export const GET = createRoute(async (c) => {
  try {
    const manager = ExecutionOptionsManager.getInstance()
    const presets = await manager.getAllPresets()
    
    return c.json({
      success: true,
      data: presets
    })
  } catch (error) {
    console.error('Failed to get execution presets:', error)
    return c.json({
      success: false,
      error: 'Failed to load execution presets'
    }, 500)
  }
})

// Save execution preset
export const POST = createRoute(async (c) => {
  try {
    const { name, options, description } = await c.req.json()
    
    if (!name || !options) {
      return c.json({
        success: false,
        error: 'Name and options are required'
      }, 400)
    }

    const manager = ExecutionOptionsManager.getInstance()
    await manager.savePreset(name, options, description)
    
    return c.json({
      success: true,
      message: `Execution preset '${name}' saved successfully`
    })
  } catch (error) {
    console.error('Failed to save execution preset:', error)
    return c.json({
      success: false,
      error: 'Failed to save execution preset'
    }, 500)
  }
})