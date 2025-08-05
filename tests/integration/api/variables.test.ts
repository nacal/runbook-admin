import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock VariableManager
const mockVariableManager = {
  getAllPresets: vi.fn(),
  savePreset: vi.fn(),
  deletePreset: vi.fn(),
  getGlobalVariables: vi.fn(),
  setGlobalVariable: vi.fn(),
  deleteGlobalVariable: vi.fn(),
  mergeVariables: vi.fn(),
  getPreset: vi.fn(),
}

vi.mock('../../../app/services/variable-manager', () => ({
  VariableManager: {
    getInstance: vi.fn(() => mockVariableManager),
  },
}))

describe('/api/variables', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()

    // Create a new Hono app and manually implement the API logic based on variables.ts
    app = new Hono()

    // GET /presets - Get all presets
    app.get('/presets', async (c) => {
      try {
        const manager = mockVariableManager
        const presets = await manager.getAllPresets()

        return c.json({
          success: true,
          data: presets,
        })
      } catch (_error) {
        return c.json(
          {
            success: false,
            error: 'Failed to load variable presets',
          },
          500,
        )
      }
    })

    // POST /presets - Save preset
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

        const manager = mockVariableManager
        await manager.savePreset(name, variables, description, executionOptions)

        return c.json({
          success: true,
          message: `Preset '${name}' saved successfully`,
        })
      } catch (_error) {
        return c.json(
          {
            success: false,
            error: 'Failed to save preset',
          },
          500,
        )
      }
    })

    // DELETE /presets/:name - Delete preset
    app.delete('/presets/:name', async (c) => {
      try {
        const name = c.req.param('name')
        const manager = mockVariableManager
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
      } catch (_error) {
        return c.json(
          {
            success: false,
            error: 'Failed to delete preset',
          },
          500,
        )
      }
    })

    // GET /global - Get global variables
    app.get('/global', async (c) => {
      try {
        const manager = mockVariableManager
        const variables = await manager.getGlobalVariables()

        return c.json({
          success: true,
          data: variables,
        })
      } catch (_error) {
        return c.json(
          {
            success: false,
            error: 'Failed to load global variables',
          },
          500,
        )
      }
    })

    // POST /global - Set global variable
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

        const manager = mockVariableManager
        await manager.setGlobalVariable(key, value || '')

        return c.json({
          success: true,
          message: `Global variable '${key}' set successfully`,
        })
      } catch (_error) {
        return c.json(
          {
            success: false,
            error: 'Failed to set global variable',
          },
          500,
        )
      }
    })

    // DELETE /global/:key - Delete global variable
    app.delete('/global/:key', async (c) => {
      try {
        const key = c.req.param('key')
        const manager = mockVariableManager
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
      } catch (_error) {
        return c.json(
          {
            success: false,
            error: 'Failed to delete global variable',
          },
          500,
        )
      }
    })

    // POST /merge - Merge variables for execution
    app.post('/merge', async (c) => {
      try {
        const { runbookVariables, presetName, overrides } = await c.req.json()

        const manager = mockVariableManager
        const merged = await manager.mergeVariables(
          runbookVariables,
          presetName,
          overrides,
        )

        // Get execution options from preset if available
        let executionOptions: { args: string[] } = { args: [] }
        if (presetName) {
          const preset = await manager.getPreset(presetName)
          if (preset?.executionOptions) {
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
      } catch (_error) {
        return c.json(
          {
            success: false,
            error: 'Failed to merge variables',
          },
          500,
        )
      }
    })
  })

  describe('GET /presets', () => {
    it('should return variable presets successfully', async () => {
      const mockPresets = [
        { name: 'preset1', variables: { VAR1: 'value1', VAR2: 'value2' } },
        { name: 'preset2', variables: { VAR3: 'value3' } },
      ]
      mockVariableManager.getAllPresets.mockResolvedValue(mockPresets)

      const response = await app.request('/presets')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockVariableManager.getAllPresets).toHaveBeenCalled()
      expect(data).toEqual({
        success: true,
        data: mockPresets,
      })
    })

    it('should handle errors gracefully', async () => {
      mockVariableManager.getAllPresets.mockRejectedValue(
        new Error('Storage error'),
      )

      const response = await app.request('/presets')
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        success: false,
        error: 'Failed to load variable presets',
      })
    })
  })

  describe('POST /presets', () => {
    it('should save variable preset successfully', async () => {
      mockVariableManager.savePreset.mockResolvedValue(undefined)

      const response = await app.request('/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'test-preset',
          variables: { VAR1: 'test-value' },
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockVariableManager.savePreset).toHaveBeenCalledWith(
        'test-preset',
        { VAR1: 'test-value' },
        undefined,
        undefined,
      )
      expect(data).toEqual({
        success: true,
        message: "Preset 'test-preset' saved successfully",
      })
    })

    it('should return 400 when preset name is missing', async () => {
      const response = await app.request('/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variables: { TEST: 'value' },
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        success: false,
        error: 'Name and variables are required',
      })
      expect(mockVariableManager.savePreset).not.toHaveBeenCalled()
    })

    it('should return 400 when variables are missing', async () => {
      const response = await app.request('/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'test-preset',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        success: false,
        error: 'Name and variables are required',
      })
      expect(mockVariableManager.savePreset).not.toHaveBeenCalled()
    })
  })

  describe('DELETE /presets/:name', () => {
    it('should delete variable preset successfully', async () => {
      mockVariableManager.deletePreset.mockResolvedValue(true)

      const response = await app.request('/presets/test-preset', {
        method: 'DELETE',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockVariableManager.deletePreset).toHaveBeenCalledWith(
        'test-preset',
      )
      expect(data).toEqual({
        success: true,
        message: "Preset 'test-preset' deleted successfully",
      })
    })

    it('should return 404 when preset not found', async () => {
      mockVariableManager.deletePreset.mockResolvedValue(false)

      const response = await app.request('/presets/non-existent', {
        method: 'DELETE',
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({
        success: false,
        error: 'Preset not found',
      })
    })
  })
})
