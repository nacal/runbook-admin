import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock VariableManager
const mockVariableManager = {
  getVariablePresets: vi.fn(),
  saveVariablePreset: vi.fn(),
  deleteVariablePreset: vi.fn(),
  getGlobalVariables: vi.fn(),
  saveGlobalVariables: vi.fn(),
}

vi.mock('../../../app/services/variable-manager', () => ({
  VariableManager: {
    getInstance: vi.fn(() => mockVariableManager),
  },
}))

describe('/api/variables', () => {
  let GET: (context: unknown) => Promise<unknown>
  let POST: (context: unknown) => Promise<unknown>
  let DELETE: (context: unknown) => Promise<unknown>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Import route handlers
    const variablesModule = await import('../../../app/routes/api/variables')
    GET = variablesModule.GET
    POST = variablesModule.POST
    DELETE = variablesModule.DELETE
  })

  describe('GET /api/variables', () => {
    it('should return variable presets successfully', async () => {
      const mockPresets = {
        preset1: { VAR1: 'value1', VAR2: 'value2' },
        preset2: { VAR3: 'value3' },
      }
      mockVariableManager.getVariablePresets.mockResolvedValue(mockPresets)

      const mockContext = {
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      const _response = await GET(mockContext)

      expect(mockVariableManager.getVariablePresets).toHaveBeenCalled()
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        data: mockPresets,
        count: 2,
      })
    })

    it('should handle errors gracefully', async () => {
      mockVariableManager.getVariablePresets.mockRejectedValue(
        new Error('Storage error'),
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
          error: expect.stringContaining('Failed to load variable presets'),
          data: {},
          count: 0,
        },
        500,
      )
    })
  })

  describe('POST /api/variables', () => {
    it('should save variable preset successfully', async () => {
      mockVariableManager.saveVariablePreset.mockResolvedValue(undefined)

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            name: 'test-preset',
            variables: { VAR1: 'test-value' },
          }),
        },
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      const _response = await POST(mockContext)

      expect(mockVariableManager.saveVariablePreset).toHaveBeenCalledWith(
        'test-preset',
        { VAR1: 'test-value' },
      )
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        message: 'Variable preset saved successfully',
      })
    })

    it('should return 400 when preset name is missing', async () => {
      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            variables: { TEST: 'value' },
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
          error: 'Preset name is required',
        },
        400,
      )
      expect(mockVariableManager.saveVariablePreset).not.toHaveBeenCalled()
    })
  })

  describe('DELETE /api/variables', () => {
    it('should delete variable preset successfully', async () => {
      mockVariableManager.deleteVariablePreset.mockResolvedValue(undefined)

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            name: 'test-preset',
          }),
        },
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      const _response = await DELETE(mockContext)

      expect(mockVariableManager.deleteVariablePreset).toHaveBeenCalledWith(
        'test-preset',
      )
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        message: 'Variable preset deleted successfully',
      })
    })
  })
})
