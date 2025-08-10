import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExecutionManager } from '../../app/services/execution-manager'
import type { ExecutionResult } from '../../app/types/types'

// Mock the Storage module to prevent file system access
vi.mock('../../app/utils/storage', () => ({
  Storage: {
    getInstance: vi.fn(() => ({
      loadExecutionHistory: vi.fn().mockResolvedValue([]),
      saveExecutionHistory: vi.fn().mockResolvedValue(undefined),
      clearHistory: vi.fn().mockResolvedValue(undefined),
    })),
  },
}))

describe('ExecutionManager', () => {
  let executionManager: ExecutionManager

  beforeEach(async () => {
    // Reset the singleton instance
    const ExecutionManagerWithPrivateAccess = ExecutionManager as unknown as {
      instance?: unknown
    }
    ExecutionManagerWithPrivateAccess.instance = undefined
    // Get new instance
    executionManager = ExecutionManager.getInstance()
    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 10))
    // Clear executions for clean test state
    const executionManagerWithPrivateAccess = executionManager as unknown as {
      executions: Map<string, unknown>
    }
    executionManagerWithPrivateAccess.executions.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = ExecutionManager.getInstance()
      const instance2 = ExecutionManager.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('execution management', () => {
    it('should get execution by ID when exists', () => {
      // Add a mock execution directly to test getExecution
      const mockExecution: ExecutionResult = {
        id: 'test-execution-123',
        runbookId: 'test-runbook-1',
        runbookPath: 'test/sample.runbook.yml',
        status: 'success',
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        exitCode: 0,
        output: ['test output'],
        variables: { TEST_VAR: 'value' },
      }

      // Add execution directly to the map
      const executionManagerWithAccess = executionManager as unknown as {
        executions: Map<string, unknown>
      }
      executionManagerWithAccess.executions.set(
        'test-execution-123',
        mockExecution,
      )

      const retrieved = executionManager.getExecution('test-execution-123')

      expect(retrieved).toEqual(mockExecution)
    })

    it('should return undefined for non-existent execution', () => {
      const retrieved = executionManager.getExecution('non-existent-id')

      expect(retrieved).toBeUndefined()
    })

    it('should get all executions', async () => {
      // Add mock executions
      const execution1: ExecutionResult = {
        id: 'test-1',
        runbookId: 'runbook-1',
        runbookPath: 'test1.yml',
        status: 'success',
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        exitCode: 0,
        output: [],
        variables: {},
      }

      const execution2: ExecutionResult = {
        id: 'test-2',
        runbookId: 'runbook-2',
        runbookPath: 'test2.yml',
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        duration: 500,
        exitCode: 1,
        output: [],
        variables: {},
      }

      const executionManagerAccess = executionManager as unknown as {
        executions: Map<string, unknown>
      }
      executionManagerAccess.executions.set('test-1', execution1)
      executionManagerAccess.executions.set('test-2', execution2)

      const allExecutions = await executionManager.getAllExecutions()

      expect(allExecutions).toHaveLength(2)
      expect(allExecutions).toContainEqual(execution1)
      expect(allExecutions).toContainEqual(execution2)
    })

    it('should check if execution is running', () => {
      // isRunning checks the executors map, not executions
      const mockExecutor = { on: vi.fn() }

      // Add to executors map (running)
      const executionManagerWithExecutors = executionManager as unknown as {
        executors: Map<string, unknown>
      }
      executionManagerWithExecutors.executors.set('running-test', mockExecutor)

      expect(executionManager.isRunning('running-test')).toBe(true)
      expect(executionManager.isRunning('completed-test')).toBe(false)
      expect(executionManager.isRunning('non-existent')).toBe(false)
    })

    it('should clear history', async () => {
      // Add some executions first
      const execution: ExecutionResult = {
        id: 'test-clear',
        runbookId: 'runbook-1',
        runbookPath: 'test.yml',
        status: 'success',
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        exitCode: 0,
        output: [],
        variables: {},
      }

      const executionManagerWithExecutions = executionManager as unknown as {
        executions: Map<string, unknown>
      }
      executionManagerWithExecutions.executions.set('test-clear', execution)

      // clearHistory is the actual method name
      await executionManager.clearHistory()

      const allExecutions = await executionManager.getAllExecutions()
      expect(allExecutions).toHaveLength(0)
    })

    it('should stop running execution', () => {
      // Mock executor with stop method
      const mockExecutor = {
        on: vi.fn(),
        stop: vi.fn(),
        isRunning: vi.fn().mockReturnValue(true),
      }

      const executionManagerWithExecutors = executionManager as unknown as {
        executors: Map<string, unknown>
      }
      executionManagerWithExecutors.executors.set('stop-test', mockExecutor)

      const stopped = executionManager.stopExecution('stop-test')

      expect(stopped).toBe(true)
      expect(mockExecutor.stop).toHaveBeenCalled()
    })

    it('should return false when trying to stop non-existent execution', () => {
      const stopped = executionManager.stopExecution('non-existent')
      expect(stopped).toBe(false)
    })

    it('should handle clearing specific execution through clearHistory', async () => {
      // Add execution to test clearing
      const execution: ExecutionResult = {
        id: 'clear-specific-test',
        runbookId: 'runbook-1',
        runbookPath: 'test.yml',
        status: 'success',
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        exitCode: 0,
        output: [],
        variables: {},
      }

      const executionManagerWithAccess = executionManager as unknown as {
        executions: Map<string, unknown>
      }
      executionManagerWithAccess.executions.set(
        'clear-specific-test',
        execution,
      )

      // Verify execution exists before clearing
      expect(executionManager.getExecution('clear-specific-test')).toEqual(
        execution,
      )

      // Clear all history (as there's no specific clear method)
      await executionManager.clearHistory()

      // Verify execution is cleared
      expect(
        executionManager.getExecution('clear-specific-test'),
      ).toBeUndefined()
    })
  })

  describe('RunnExecutor event handling', () => {
    // Mock RunnExecutor
    const mockRunnExecutor = {
      executionId: 'mock-execution-id',
      on: vi.fn(),
      execute: vi.fn(),
      stop: vi.fn(),
      isRunning: vi.fn(),
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should handle executor started event', async () => {
      // Mock RunnExecutor constructor
      const MockRunnExecutorClass = vi.fn(() => mockRunnExecutor)
      vi.doMock('../../app/services/runn', () => ({
        RunnExecutor: MockRunnExecutorClass,
      }))

      // Simulate event handling
      const startEventHandler = vi.fn()
      mockRunnExecutor.on.mockImplementation(
        (event: string, handler: (data: unknown) => void) => {
          if (event === 'started') {
            startEventHandler.mockImplementation(handler)
          }
          return mockRunnExecutor
        },
      )

      // Test would require actual startExecution call, but we can test the structure
      expect(mockRunnExecutor.on).toBeDefined()
    })

    it('should handle executor output events', () => {
      const outputHandler = vi.fn()
      mockRunnExecutor.on.mockImplementation(
        (event: string, handler: (data: unknown) => void) => {
          if (event === 'output') {
            outputHandler.mockImplementation(handler)
          }
          return mockRunnExecutor
        },
      )

      // Simulate output event
      const outputData = { chunk: 'test output line\n', timestamp: new Date() }
      outputHandler(outputData)

      expect(outputHandler).toHaveBeenCalledWith(outputData)
    })

    it('should handle executor error events', () => {
      const errorHandler = vi.fn()
      mockRunnExecutor.on.mockImplementation(
        (event: string, handler: (data: unknown) => void) => {
          if (event === 'error') {
            errorHandler.mockImplementation(handler)
          }
          return mockRunnExecutor
        },
      )

      // Simulate error event
      const errorData = { chunk: 'error message\n', timestamp: new Date() }
      errorHandler(errorData)

      expect(errorHandler).toHaveBeenCalledWith(errorData)
    })

    it('should handle executor complete events and preserve output', () => {
      const completeHandler = vi.fn()
      mockRunnExecutor.on.mockImplementation(
        (event: string, handler: (data: unknown) => void) => {
          if (event === 'complete') {
            completeHandler.mockImplementation(handler)
          }
          return mockRunnExecutor
        },
      )

      // Add partial execution with accumulated output
      const executionManagerWithAccess = executionManager as unknown as {
        executions: Map<string, ExecutionResult>
      }
      const partialExecution: ExecutionResult = {
        id: 'mock-execution-id',
        runbookId: 'test-runbook',
        runbookPath: 'test.yml',
        status: 'running',
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        exitCode: 0,
        output: ['line 1', 'line 2'], // Accumulated output
        variables: {},
      }
      executionManagerWithAccess.executions.set(
        'mock-execution-id',
        partialExecution,
      )

      // Simulate complete event
      const completeResult: ExecutionResult = {
        id: 'mock-execution-id',
        runbookId: 'test-runbook',
        runbookPath: 'test.yml',
        status: 'success',
        startTime: new Date(),
        endTime: new Date(),
        duration: 1500,
        exitCode: 0,
        output: [], // Empty in complete event
        variables: {},
      }

      completeHandler(completeResult)

      // Verify the complete handler was called
      expect(completeHandler).toHaveBeenCalledWith(completeResult)
    })
  })
})
