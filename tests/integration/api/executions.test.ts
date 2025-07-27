import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock services
const mockExecutionManager = {
  getExecution: vi.fn(),
  getAllExecutions: vi.fn(),
  stopExecution: vi.fn(),
  clearExecution: vi.fn(),
  clearAllExecutions: vi.fn(),
}

vi.mock('../../../app/services/execution-manager', () => ({
  ExecutionManager: {
    getInstance: vi.fn(() => mockExecutionManager),
  },
}))

describe('API Executions Tests', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono()
  })

  describe('/api/executions', () => {
    it('should get all executions successfully', async () => {
      const mockExecutions = [
        {
          id: 'exec-1',
          runbookId: 'runbook-1',
          runbookPath: '/test/book1.yml',
          status: 'completed',
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:05:00Z'),
          output: 'Test output',
          variables: { VAR1: 'value1' },
        },
        {
          id: 'exec-2',
          runbookId: 'runbook-2',
          runbookPath: '/test/book2.yml',
          status: 'running',
          startTime: new Date('2024-01-01T11:00:00Z'),
          endTime: null,
          output: 'Running...',
          variables: {},
        },
      ]

      mockExecutionManager.getAllExecutions.mockResolvedValue(mockExecutions)

      app.get('/api/executions', async (c) => {
        try {
          const executions = await mockExecutionManager.getAllExecutions()
          return c.json({
            success: true,
            data: executions,
            count: executions.length,
          })
        } catch (error) {
          return c.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: [],
              count: 0,
            },
            500,
          )
        }
      })

      const res = await app.request('/api/executions')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.count).toBe(2)
      expect(json.data).toHaveLength(2)
      expect(json.data[0]).toMatchObject({
        id: 'exec-1',
        runbookId: 'runbook-1',
        status: 'completed',
        variables: { VAR1: 'value1' },
      })
      expect(mockExecutionManager.getAllExecutions).toHaveBeenCalled()
    })

    it('should get single execution by ID', async () => {
      const executionId = 'exec-123'
      const mockExecution = {
        id: executionId,
        runbookId: 'runbook-1',
        runbookPath: '/test/book1.yml',
        status: 'completed',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:05:00Z'),
        output: 'Detailed output content',
        variables: { VAR1: 'value1', VAR2: 'value2' },
        executionOptions: { verbose: true },
      }

      mockExecutionManager.getExecution.mockResolvedValue(mockExecution)

      app.get('/api/executions/:id', async (c) => {
        try {
          const executionId = c.req.param('id')

          if (!executionId) {
            return c.json(
              {
                success: false,
                error: 'Execution ID is required',
              },
              400,
            )
          }

          const execution = await mockExecutionManager.getExecution(executionId)

          if (!execution) {
            return c.json(
              {
                success: false,
                error: 'Execution not found',
              },
              404,
            )
          }

          return c.json({
            success: true,
            data: execution,
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

      const res = await app.request(`/api/executions/${executionId}`)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toMatchObject({
        id: executionId,
        runbookId: 'runbook-1',
        status: 'completed',
        variables: { VAR1: 'value1', VAR2: 'value2' },
      })
      expect(mockExecutionManager.getExecution).toHaveBeenCalledWith(
        executionId,
      )
    })

    it('should return 404 for non-existent execution', async () => {
      const executionId = 'non-existent'
      mockExecutionManager.getExecution.mockResolvedValue(null)

      app.get('/api/executions/:id', async (c) => {
        try {
          const executionId = c.req.param('id')

          if (!executionId) {
            return c.json(
              {
                success: false,
                error: 'Execution ID is required',
              },
              400,
            )
          }

          const execution = await mockExecutionManager.getExecution(executionId)

          if (!execution) {
            return c.json(
              {
                success: false,
                error: 'Execution not found',
              },
              404,
            )
          }

          return c.json({
            success: true,
            data: execution,
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

      const res = await app.request(`/api/executions/${executionId}`)
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json).toEqual({
        success: false,
        error: 'Execution not found',
      })
    })

    it('should stop execution successfully', async () => {
      const executionId = 'exec-running'
      mockExecutionManager.stopExecution.mockResolvedValue(true)

      app.patch('/api/executions/:id/stop', async (c) => {
        try {
          const executionId = c.req.param('id')

          if (!executionId) {
            return c.json(
              {
                success: false,
                error: 'Execution ID is required',
              },
              400,
            )
          }

          const stopped = await mockExecutionManager.stopExecution(executionId)

          if (!stopped) {
            return c.json(
              {
                success: false,
                error: 'Failed to stop execution or execution not found',
              },
              400,
            )
          }

          return c.json({
            success: true,
            message: 'Execution stopped successfully',
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

      const res = await app.request(`/api/executions/${executionId}/stop`, {
        method: 'PATCH',
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toEqual({
        success: true,
        message: 'Execution stopped successfully',
      })
      expect(mockExecutionManager.stopExecution).toHaveBeenCalledWith(
        executionId,
      )
    })

    it('should delete execution successfully', async () => {
      const executionId = 'exec-to-delete'
      mockExecutionManager.clearExecution.mockResolvedValue(true)

      app.delete('/api/executions/:id', async (c) => {
        try {
          const executionId = c.req.param('id')

          if (!executionId) {
            return c.json(
              {
                success: false,
                error: 'Execution ID is required',
              },
              400,
            )
          }

          const deleted = await mockExecutionManager.clearExecution(executionId)

          if (!deleted) {
            return c.json(
              {
                success: false,
                error: 'Execution not found or could not be deleted',
              },
              404,
            )
          }

          return c.json({
            success: true,
            message: 'Execution deleted successfully',
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

      const res = await app.request(`/api/executions/${executionId}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toEqual({
        success: true,
        message: 'Execution deleted successfully',
      })
      expect(mockExecutionManager.clearExecution).toHaveBeenCalledWith(
        executionId,
      )
    })

    it('should clear all executions', async () => {
      mockExecutionManager.clearAllExecutions.mockResolvedValue(undefined)

      app.delete('/api/executions', async (c) => {
        try {
          await mockExecutionManager.clearAllExecutions()
          return c.json({
            success: true,
            message: 'All executions cleared successfully',
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

      const res = await app.request('/api/executions', {
        method: 'DELETE',
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toEqual({
        success: true,
        message: 'All executions cleared successfully',
      })
      expect(mockExecutionManager.clearAllExecutions).toHaveBeenCalled()
    })
  })
})
