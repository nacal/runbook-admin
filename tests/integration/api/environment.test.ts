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
  let GET: (context: unknown) => Promise<unknown>
  let POST: (context: unknown) => Promise<unknown>
  let DELETE: (context: unknown) => Promise<unknown>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Import route handlers
    const environmentModule = await import(
      '../../../app/routes/api/environment'
    )
    GET = environmentModule.GET
    POST = environmentModule.POST
    DELETE = environmentModule.DELETE
  })

  describe('GET /api/environment', () => {
    it('should return environment variables successfully', async () => {
      const mockVariables = [
        { name: 'NODE_ENV', value: 'test', masked: false },
        { name: 'SECRET_KEY', value: '***', masked: true },
      ]
      mockEnvironmentManager.getMaskedVariables.mockResolvedValue(mockVariables)

      const mockContext = {
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      const _response = await GET(mockContext)

      expect(mockEnvironmentManager.getMaskedVariables).toHaveBeenCalled()
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        data: mockVariables,
      })
    })

    it('should handle errors gracefully', async () => {
      mockEnvironmentManager.getMaskedVariables.mockRejectedValue(
        new Error('Access denied'),
      )

      const mockContext = {
        json: vi
          .fn()
          .mockImplementation((data, status) => ({ json: data, status })),
      }

      const _response = await GET(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Failed to load environment variables',
        },
        500,
      )
    })
  })

  describe('POST /api/environment', () => {
    it('should set environment variable successfully', async () => {
      mockEnvironmentManager.setVariable.mockResolvedValue(undefined)

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            key: 'TEST_VAR',
            value: 'test_value',
            description: 'Test variable',
            isSecret: false,
          }),
        },
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      const _response = await POST(mockContext)

      expect(mockEnvironmentManager.setVariable).toHaveBeenCalledWith(
        'TEST_VAR',
        'test_value',
        'Test variable',
        false,
      )
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        message: "Environment variable 'TEST_VAR' set successfully",
      })
    })

    it('should return 400 when key or value is missing', async () => {
      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            key: 'TEST_VAR',
            // value missing
          }),
        },
        json: vi
          .fn()
          .mockImplementation((data, status) => ({ json: data, status })),
      }

      const _response = await POST(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Key and value are required',
        },
        400,
      )
      expect(mockEnvironmentManager.setVariable).not.toHaveBeenCalled()
    })
  })

  describe('DELETE /api/environment', () => {
    it('should delete environment variable successfully', async () => {
      mockEnvironmentManager.deleteVariable.mockResolvedValue(true)

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            key: 'TEST_VAR',
          }),
        },
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      const _response = await DELETE(mockContext)

      expect(mockEnvironmentManager.deleteVariable).toHaveBeenCalledWith(
        'TEST_VAR',
      )
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        message: "Environment variable 'TEST_VAR' deleted successfully",
      })
    })

    it('should return 404 when variable not found', async () => {
      mockEnvironmentManager.deleteVariable.mockResolvedValue(false)

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            key: 'NONEXISTENT_VAR',
          }),
        },
        json: vi
          .fn()
          .mockImplementation((data, status) => ({ json: data, status })),
      }

      const _response = await DELETE(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Environment variable not found',
        },
        404,
      )
    })

    it('should return 400 when key is missing', async () => {
      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({}),
        },
        json: vi
          .fn()
          .mockImplementation((data, status) => ({ json: data, status })),
      }

      const _response = await DELETE(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Key is required',
        },
        400,
      )
      expect(mockEnvironmentManager.deleteVariable).not.toHaveBeenCalled()
    })
  })
})
