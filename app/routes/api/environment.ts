import { createRoute } from 'honox/factory'
import { EnvironmentManager } from '../../services/environment-manager'

// Get all environment variables
export const GET = createRoute(async (c) => {
  try {
    const manager = EnvironmentManager.getInstance()
    const variables = await manager.getMaskedVariables()
    
    return c.json({
      success: true,
      data: variables
    })
  } catch (error) {
    console.error('Failed to get environment variables:', error)
    return c.json({
      success: false,
      error: 'Failed to load environment variables'
    }, 500)
  }
})

// Set environment variable
export const POST = createRoute(async (c) => {
  try {
    const { key, value, description, isSecret } = await c.req.json()
    
    if (!key || value === undefined) {
      return c.json({
        success: false,
        error: 'Key and value are required'
      }, 400)
    }

    const manager = EnvironmentManager.getInstance()
    await manager.setVariable(key, value, description, isSecret)
    
    return c.json({
      success: true,
      message: `Environment variable '${key}' set successfully`
    })
  } catch (error) {
    console.error('Failed to set environment variable:', error)
    return c.json({
      success: false,
      error: 'Failed to set environment variable'
    }, 500)
  }
})

// Delete environment variable
export const DELETE = createRoute(async (c) => {
  try {
    const { key } = await c.req.json()
    
    if (!key) {
      return c.json({
        success: false,
        error: 'Key is required'
      }, 400)
    }

    const manager = EnvironmentManager.getInstance()
    const deleted = await manager.deleteVariable(key)
    
    if (deleted) {
      return c.json({
        success: true,
        message: `Environment variable '${key}' deleted successfully`
      })
    } else {
      return c.json({
        success: false,
        error: 'Environment variable not found'
      }, 404)
    }
  } catch (error) {
    console.error('Failed to delete environment variable:', error)
    return c.json({
      success: false,
      error: 'Failed to delete environment variable'
    }, 500)
  }
})