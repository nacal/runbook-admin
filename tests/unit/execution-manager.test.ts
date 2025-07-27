import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
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
    ;(ExecutionManager as any).instance = undefined
    // Get new instance
    executionManager = ExecutionManager.getInstance()
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 10))
    // Clear executions for clean test state
    ;(executionManager as any).executions.clear()
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
      ;(executionManager as any).executions.set('test-execution-123', mockExecution)

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

      ;(executionManager as any).executions.set('test-1', execution1)
      ;(executionManager as any).executions.set('test-2', execution2)

      const allExecutions = await executionManager.getAllExecutions()
      
      expect(allExecutions).toHaveLength(2)
      expect(allExecutions).toContainEqual(execution1)
      expect(allExecutions).toContainEqual(execution2)
    })

    it('should check if execution is running', () => {
      // isRunning checks the executors map, not executions
      const mockExecutor = { on: vi.fn() }
      
      // Add to executors map (running)
      ;(executionManager as any).executors.set('running-test', mockExecutor)

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

      ;(executionManager as any).executions.set('test-clear', execution)

      // clearHistory is the actual method name
      await executionManager.clearHistory()

      const allExecutions = await executionManager.getAllExecutions()
      expect(allExecutions).toHaveLength(0)
    })
  })
})