import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock ExecutionManager
const mockExecutionManager = {
  startExecution: vi.fn(),
}

// Mock RunnExecutor
const mockRunnExecutor = {
  checkRunnAvailable: vi.fn(),
}

vi.mock('../../../app/services/execution-manager', () => ({
  ExecutionManager: {
    getInstance: vi.fn(() => mockExecutionManager),
  },
}))

vi.mock('../../../app/services/runn', () => ({
  RunnExecutor: {
    checkRunnAvailable: mockRunnExecutor.checkRunnAvailable,
  },
}))

describe('/api/execute', () => {
  let POST: (context: unknown) => Promise<unknown>
  let GET: (context: unknown) => Promise<unknown>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Import route handlers
    const executeModule = await import('../../../app/routes/api/execute')
    POST = executeModule.POST
    GET = executeModule.GET
  })

  describe('POST /api/execute', () => {
    it('should start execution successfully', async () => {
      const executionId = 'exec-123'
      mockRunnExecutor.checkRunnAvailable.mockResolvedValue(true)
      mockExecutionManager.startExecution.mockResolvedValue(executionId)

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            runbookPath: '/test/runbook.yml',
            variables: { VAR1: 'value1' },
          }),
        },
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      const _response = await POST(mockContext)

      expect(mockRunnExecutor.checkRunnAvailable).toHaveBeenCalled()
      expect(mockExecutionManager.startExecution).toHaveBeenCalledWith(
        '/test/runbook.yml',
        { VAR1: 'value1' },
        undefined,
      )
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        executionId,
        message: 'Execution started',
      })
    })

    it('should return 400 when runbookPath is missing', async () => {
      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            variables: {},
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
          error: 'runbookPath is required',
        },
        400,
      )
      expect(mockRunnExecutor.checkRunnAvailable).not.toHaveBeenCalled()
    })

    it('should return 400 when runn is not available', async () => {
      mockRunnExecutor.checkRunnAvailable.mockResolvedValue(false)

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({
            runbookPath: '/test/runbook.yml',
          }),
        },
        json: vi
          .fn()
          .mockImplementation((data, status) => ({ json: data, status })),
      }

      const _response = await POST(mockContext)

      expect(mockRunnExecutor.checkRunnAvailable).toHaveBeenCalled()
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: expect.stringContaining('Runn CLI is not installed'),
        },
        400,
      )
      expect(mockExecutionManager.startExecution).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/execute', () => {
    it('should return execution status', async () => {
      mockRunnExecutor.checkRunnAvailable.mockResolvedValue(true)

      const mockContext = {
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      const _response = await GET(mockContext)

      expect(mockRunnExecutor.checkRunnAvailable).toHaveBeenCalled()
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        runnAvailable: true,
        status: 'ready',
      })
    })
  })
})
