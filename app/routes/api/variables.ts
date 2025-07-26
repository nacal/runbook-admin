import { Hono } from 'hono'
import { VariableManager } from '../../services/variable-manager'

const app = new Hono()

// Get all presets
app.get('/presets', async (c) => {
  try {
    const manager = VariableManager.getInstance()
    const presets = await manager.getAllPresets()

    return c.json({
      success: true,
      data: presets,
    })
  } catch (error) {
    console.error('Failed to get presets:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to load variable presets',
      },
      500,
    )
  }
})

// Save preset
app.post('/presets', async (c) => {
  try {
    const { name, variables, description, executionOptions } =
      await c.req.json()

    if (!name || !variables) {
      return c.json(
        {
          success: false,
          error: 'Name and variables are required',
        },
        400,
      )
    }

    const manager = VariableManager.getInstance()
    await manager.savePreset(name, variables, description, executionOptions)

    return c.json({
      success: true,
      message: `Preset '${name}' saved successfully`,
    })
  } catch (error) {
    console.error('Failed to save preset:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to save preset',
      },
      500,
    )
  }
})

// Delete preset
app.delete('/presets/:name', async (c) => {
  try {
    const name = c.req.param('name')
    const manager = VariableManager.getInstance()
    const deleted = await manager.deletePreset(name)

    if (deleted) {
      return c.json({
        success: true,
        message: `Preset '${name}' deleted successfully`,
      })
    } else {
      return c.json(
        {
          success: false,
          error: 'Preset not found',
        },
        404,
      )
    }
  } catch (error) {
    console.error('Failed to delete preset:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to delete preset',
      },
      500,
    )
  }
})

// Get global variables
app.get('/global', async (c) => {
  try {
    const manager = VariableManager.getInstance()
    const variables = await manager.getGlobalVariables()

    return c.json({
      success: true,
      data: variables,
    })
  } catch (error) {
    console.error('Failed to get global variables:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to load global variables',
      },
      500,
    )
  }
})

// Set global variable
app.post('/global', async (c) => {
  try {
    const { key, value } = await c.req.json()

    if (!key) {
      return c.json(
        {
          success: false,
          error: 'Key is required',
        },
        400,
      )
    }

    const manager = VariableManager.getInstance()
    await manager.setGlobalVariable(key, value || '')

    return c.json({
      success: true,
      message: `Global variable '${key}' set successfully`,
    })
  } catch (error) {
    console.error('Failed to set global variable:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to set global variable',
      },
      500,
    )
  }
})

// Delete global variable
app.delete('/global/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const manager = VariableManager.getInstance()
    const deleted = await manager.deleteGlobalVariable(key)

    if (deleted) {
      return c.json({
        success: true,
        message: `Global variable '${key}' deleted successfully`,
      })
    } else {
      return c.json(
        {
          success: false,
          error: 'Global variable not found',
        },
        404,
      )
    }
  } catch (error) {
    console.error('Failed to delete global variable:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to delete global variable',
      },
      500,
    )
  }
})

// Merge variables for execution
app.post('/merge', async (c) => {
  try {
    const { runbookVariables, presetName, overrides } = await c.req.json()

    const manager = VariableManager.getInstance()
    const merged = await manager.mergeVariables(
      runbookVariables,
      presetName,
      overrides,
    )

    // Get execution options from preset if available
    let executionOptions = { args: [] }
    if (presetName) {
      const preset = await manager.getPreset(presetName)
      if (preset && preset.executionOptions) {
        executionOptions = preset.executionOptions
      }
    }

    return c.json({
      success: true,
      data: {
        variables: merged,
        executionOptions,
      },
    })
  } catch (error) {
    console.error('Failed to merge variables:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to merge variables',
      },
      500,
    )
  }
})

export default app
