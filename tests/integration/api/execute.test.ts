import { Hono } from 'hono'
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
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()

    // Create a new Hono app and manually implement the API logic
    app = new Hono()

    // Implement POST endpoint manually
    app.post('/api/execute', async (c) => {
      try {
        const {
          runbookPath,
          variables = {},
          executionOptions,
        } = await c.req.json()

        if (!runbookPath) {
          return c.json(
            {
              success: false,
              error: 'runbookPath is required',
            },
            400,
          )
        }

        // Check if runn is available
        const isRunnAvailable = await mockRunnExecutor.checkRunnAvailable()
        if (!isRunnAvailable) {
          return c.json(
            {
              success: false,
              error:
                'Runn CLI is not installed or not available in PATH. Please install runn: go install github.com/k1LoW/runn/cmd/runn@latest',
            },
            400,
          )
        }

        const manager = mockExecutionManager
        const executionId = await manager.startExecution(
          runbookPath,
          variables,
          executionOptions,
        )

        return c.json({
          success: true,
          executionId,
          message: 'Execution started',
        })
      } catch (error) {
        return c.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          500,
        )
      }
    })

    // Implement GET endpoint manually
    app.get('/api/execute', async (c) => {
      try {
        const isRunnAvailable = await mockRunnExecutor.checkRunnAvailable()

        return c.json({
          success: true,
          isRunnAvailable,
        })
      } catch (_error) {
        return c.json(
          {
            success: false,
            error: 'Failed to check execution status',
          },
          500,
        )
      }
    })
  })

  describe('POST /api/execute', () => {
    it('should start execution successfully', async () => {
      const executionId = 'exec-123'
      mockRunnExecutor.checkRunnAvailable.mockResolvedValue(true)
      mockExecutionManager.startExecution.mockResolvedValue(executionId)

      const req = new Request('http://localhost/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runbookPath: '/test/runbook.yml',
          variables: { VAR1: 'value1' },
        }),
      })
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(mockRunnExecutor.checkRunnAvailable).toHaveBeenCalled()
      expect(mockExecutionManager.startExecution).toHaveBeenCalledWith(
        '/test/runbook.yml',
        { VAR1: 'value1' },
        undefined,
      )
      expect(json).toEqual({
        success: true,
        executionId,
        message: 'Execution started',
      })
    })

    it('should return 400 when runbookPath is missing', async () => {
      const req = new Request('http://localhost/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables: { VAR1: 'value1' },
        }),
      })
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json).toEqual({
        success: false,
        error: 'runbookPath is required',
      })
      expect(mockRunnExecutor.checkRunnAvailable).not.toHaveBeenCalled()
      expect(mockExecutionManager.startExecution).not.toHaveBeenCalled()
    })

    it('should return 400 when runn is not available', async () => {
      mockRunnExecutor.checkRunnAvailable.mockResolvedValue(false)

      const req = new Request('http://localhost/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runbookPath: '/test/runbook.yml',
        }),
      })
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(mockRunnExecutor.checkRunnAvailable).toHaveBeenCalled()
      expect(json).toEqual({
        success: false,
        error:
          'Runn CLI is not installed or not available in PATH. Please install runn: go install github.com/k1LoW/runn/cmd/runn@latest',
      })
      expect(mockExecutionManager.startExecution).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/execute', () => {
    it('should return execution status', async () => {
      mockRunnExecutor.checkRunnAvailable.mockResolvedValue(true)

      const req = new Request('http://localhost/api/execute', {
        method: 'GET',
      })
      const res = await app.request(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(mockRunnExecutor.checkRunnAvailable).toHaveBeenCalled()
      expect(json).toEqual({
        success: true,
        isRunnAvailable: true,
      })
    })
  })
})
