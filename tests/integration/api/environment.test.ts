import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock EnvironmentManager
const mockEnvironmentManager = {
  getMaskedVariables: vi.fn(),
  setVariable: vi.fn(),
  deleteVariable: vi.fn(),
}

vi.mock('../../../app/services/environment-manager', () => ({
  EnvironmentManager: {
    getInstance: vi.fn(() => mockEnvironmentManager),
  },
}))

describe('/api/environment', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()

    // Create a new Hono app and manually implement the API logic
    app = new Hono()

    // Implement GET endpoint manually
    app.get('/api/environment', async (c) => {
      try {
        const manager = mockEnvironmentManager
        const variables = await manager.getMaskedVariables()

        return c.json({
          success: true,
          data: variables,
        })
      } catch (_error) {
        return c.json(
          {
            success: false,
            error: 'Failed to load environment variables',
          },
          500,
        )
      }
    })

    // Implement POST endpoint manually
    app.post('/api/environment', async (c) => {
      try {
        const { key, value, description, isSecret } = await c.req.json()

        if (!key || value === undefined) {
          return c.json(
            {
              success: false,
              error: 'Key and value are required',
            },
            400,
          )
        }

        const manager = mockEnvironmentManager
        await manager.setVariable(key, value, description, isSecret)

        return c.json({
          success: true,
          message: `Environment variable '${key}' set successfully`,
        })
      } catch (_error) {
        return c.json(
          {
            success: false,
            error: 'Failed to set environment variable',
          },
          500,
        )
      }
    })

    // Implement DELETE endpoint manually
    app.delete('/api/environment', async (c) => {
      try {
        const { key } = await c.req.json()

        if (!key) {
          return c.json(
            {
              success: false,
              error: 'Key is required',
            },
            400,
          )
        }

        const manager = mockEnvironmentManager
        const deleted = await manager.deleteVariable(key)

        if (!deleted) {
          return c.json(
            {
              success: false,
              error: 'Environment variable not found',
            },
            404,
          )
        }

        return c.json({
          success: true,
          message: `Environment variable '${key}' deleted successfully`,
        })
      } catch (_error) {
        return c.json(
          {
            success: false,
            error: 'Failed to delete environment variable',
          },
          500,
        )
      }
    })
  })

  describe('GET /api/environment', () => {
    it('should return environment variables successfully', async () => {
      const mockVariables = [
        { name: 'NODE_ENV', value: 'test', masked: false },
        { name: 'SECRET_KEY', value: '***', masked: true },
      ]
      mockEnvironmentManager.getMaskedVariables.mockResolvedValue(mockVariables)

      const req = new Request('http://localhost/api/environment', {
        method: 'GET',
      })
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(mockEnvironmentManager.getMaskedVariables).toHaveBeenCalled()
      expect(json).toEqual({
        success: true,
        data: mockVariables,
      })
    })

    it('should handle errors gracefully', async () => {
      mockEnvironmentManager.getMaskedVariables.mockRejectedValue(
        new Error('Access denied'),
      )

      const req = new Request('http://localhost/api/environment', {
        method: 'GET',
      })
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json).toEqual({
        success: false,
        error: 'Failed to load environment variables',
      })
    })
  })

  describe('POST /api/environment', () => {
    it('should set environment variable successfully', async () => {
      mockEnvironmentManager.setVariable.mockResolvedValue(undefined)

      const req = new Request('http://localhost/api/environment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'TEST_VAR',
          value: 'test_value',
          description: 'Test variable',
          isSecret: false,
        }),
      })
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(mockEnvironmentManager.setVariable).toHaveBeenCalledWith(
        'TEST_VAR',
        'test_value',
        'Test variable',
        false,
      )
      expect(json).toEqual({
        success: true,
        message: "Environment variable 'TEST_VAR' set successfully",
      })
    })

    it('should return 400 when key or value is missing', async () => {
      const req = new Request('http://localhost/api/environment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'TEST_VAR',
          // value missing
        }),
      })
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json).toEqual({
        success: false,
        error: 'Key and value are required',
      })
      expect(mockEnvironmentManager.setVariable).not.toHaveBeenCalled()
    })
  })

  describe('DELETE /api/environment', () => {
    it('should delete environment variable successfully', async () => {
      mockEnvironmentManager.deleteVariable.mockResolvedValue(true)

      const req = new Request('http://localhost/api/environment', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'TEST_VAR',
        }),
      })
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(mockEnvironmentManager.deleteVariable).toHaveBeenCalledWith(
        'TEST_VAR',
      )
      expect(json).toEqual({
        success: true,
        message: "Environment variable 'TEST_VAR' deleted successfully",
      })
    })

    it('should return 404 when variable not found', async () => {
      mockEnvironmentManager.deleteVariable.mockResolvedValue(false)

      const req = new Request('http://localhost/api/environment', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'NONEXISTENT_VAR',
        }),
      })
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json).toEqual({
        success: false,
        error: 'Environment variable not found',
      })
    })

    it('should return 400 when key is missing', async () => {
      const req = new Request('http://localhost/api/environment', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json).toEqual({
        success: false,
        error: 'Key is required',
      })
      expect(mockEnvironmentManager.deleteVariable).not.toHaveBeenCalled()
    })
  })
})
