import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExecutionOptions } from '../../app/types/types'

// Mock child_process with proper EventEmitter
const createMockChildProcess = () => {
  const mockProcess = new EventEmitter()
  Object.assign(mockProcess, {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    kill: vi.fn(),
    pid: 12345,
  })
  return mockProcess
}

let mockChildProcess: ReturnType<typeof createMockChildProcess>
const mockSpawn = vi.fn()

vi.mock('node:child_process', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    spawn: mockSpawn,
  }
})

// Mock crypto with deterministic output
vi.mock('node:crypto', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('abc123def456789'),
    })),
  }
})

// Mock EnvironmentManager
const mockEnvironmentManager = {
  getEnvironmentForExecution: vi.fn().mockResolvedValue({
    PATH: '/usr/bin:/bin',
    TEST_VAR: 'test_value',
    SECRET_KEY: 'secret123',
  }),
}
vi.mock('../../app/services/environment-manager', () => ({
  EnvironmentManager: {
    getInstance: vi.fn(() => mockEnvironmentManager),
  },
}))

// Mock ExecutionOptionsManager
const mockExecutionOptionsManager = {
  buildCommandArgs: vi.fn().mockReturnValue([]),
}
vi.mock('../../app/services/execution-options-manager', () => ({
  ExecutionOptionsManager: {
    getInstance: vi.fn(() => mockExecutionOptionsManager),
  },
}))

describe('RunnExecutor (Complete Tests)', () => {
  let RunnExecutor: typeof import('../../app/services/runn').RunnExecutor
  let executor: InstanceType<
    typeof import('../../app/services/runn').RunnExecutor
  >

  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset all mocks before each test
    mockEnvironmentManager.getEnvironmentForExecution.mockResolvedValue({
      PATH: '/usr/bin:/bin',
      TEST_VAR: 'test_value',
      SECRET_KEY: 'secret123',
    })
    mockExecutionOptionsManager.buildCommandArgs.mockReturnValue([])

    // Create fresh mock child process for each test
    mockChildProcess = createMockChildProcess()
    mockSpawn.mockReturnValue(mockChildProcess)

    // Import the module after mocks are set up
    vi.resetModules()
    const runnModule = await import('../../app/services/runn')
    RunnExecutor = runnModule.RunnExecutor
    executor = new RunnExecutor()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('successful execution flow', () => {
    it('should execute runbook successfully with all events', async () => {
      const runbookPath = '/test/runbook.yml'
      const variables = { VAR1: 'value1', VAR2: 42, BOOL_VAR: true }
      const timeout = 5000

      // Set up event listeners
      const startedHandler = vi.fn()
      const outputHandler = vi.fn()
      const errorHandler = vi.fn()
      const completeHandler = vi.fn()

      executor.on('started', startedHandler)
      executor.on('output', outputHandler)
      executor.on('error', errorHandler)
      executor.on('complete', completeHandler)

      // Start execution
      const executionPromise = executor.execute(runbookPath, variables, timeout)

      // Wait for spawn to be called
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Verify spawn was called with correct arguments
      expect(mockSpawn).toHaveBeenCalledWith(
        'runn',
        [
          'run',
          runbookPath,
          '--var',
          'VAR1:value1',
          '--var',
          'VAR2:42',
          '--var',
          'BOOL_VAR:true',
        ],
        expect.objectContaining({
          cwd: process.cwd(),
          stdio: ['ignore', 'pipe', 'pipe'],
          env: expect.objectContaining({
            PATH: '/usr/bin:/bin',
            TEST_VAR: 'test_value',
            SECRET_KEY: 'secret123',
          }),
        }),
      )

      // Verify started event was emitted
      expect(startedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: executor.executionId,
          runbookPath,
          startTime: expect.any(Date),
        }),
      )

      // Simulate stdout output
      mockChildProcess.stdout.emit(
        'data',
        Buffer.from('Step 1: Starting test\\n'),
      )
      mockChildProcess.stdout.emit(
        'data',
        Buffer.from('Step 2: Running validation\\n'),
      )
      mockChildProcess.stdout.emit(
        'data',
        Buffer.from('Step 3: Test completed successfully\\n'),
      )

      // Simulate stderr output (warnings)
      mockChildProcess.stderr.emit(
        'data',
        Buffer.from('Warning: deprecated feature used\\n'),
      )

      // Verify output events were emitted
      expect(outputHandler).toHaveBeenCalledTimes(3)
      expect(outputHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          chunk: 'Step 1: Starting test\\n',
          timestamp: expect.any(Date),
        }),
      )

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          chunk: 'Warning: deprecated feature used\\n',
          timestamp: expect.any(Date),
        }),
      )

      // Verify executor is running
      expect(executor.isRunning()).toBe(true)

      // Simulate successful process completion
      mockChildProcess.emit('close', 0)

      const result = await executionPromise

      // Verify result
      expect(result).toEqual({
        id: executor.executionId,
        runbookId: 'abc123def456789',
        runbookPath,
        status: 'success',
        exitCode: 0,
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        duration: expect.any(Number),
        output: [
          'Step 1: Starting test',
          'Step 2: Running validation',
          'Step 3: Test completed successfully',
        ],
        error: undefined,
        variables,
      })

      // Verify complete event was emitted
      expect(completeHandler).toHaveBeenCalledWith(result)

      // Verify executor is no longer running
      expect(executor.isRunning()).toBe(false)

      // Verify duration is reasonable
      expect(result.duration).toBeGreaterThan(0)
      expect(result.duration).toBeLessThan(1000)
    })

    it('should include execution options in command', async () => {
      const runbookPath = '/test/runbook.yml'
      const executionOptions: ExecutionOptions = {
        failFast: true,
        skipTest: false,
        debug: true,
        args: ['--verbose', '--timeout=30s'],
      }

      mockExecutionOptionsManager.buildCommandArgs.mockReturnValue([
        '--verbose',
        '--timeout=30s',
      ])

      const executionPromise = executor.execute(
        runbookPath,
        {},
        5000,
        executionOptions,
      )

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockExecutionOptionsManager.buildCommandArgs).toHaveBeenCalledWith(
        executionOptions,
      )
      expect(mockSpawn).toHaveBeenCalledWith(
        'runn',
        ['run', runbookPath, '--verbose', '--timeout=30s'],
        expect.any(Object),
      )

      // Complete the execution
      mockChildProcess.emit('close', 0)
      await executionPromise
    })
  })

  describe('failed execution flow', () => {
    it('should handle execution failure with error output', async () => {
      const runbookPath = '/test/failing-runbook.yml'

      const completeHandler = vi.fn()
      executor.on('complete', completeHandler)

      const executionPromise = executor.execute(runbookPath)

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Simulate stderr output
      mockChildProcess.stderr.emit(
        'data',
        Buffer.from('Error: Test assertion failed\\n'),
      )
      mockChildProcess.stderr.emit(
        'data',
        Buffer.from('Expected: true, Got: false\\n'),
      )

      // Simulate process failure
      mockChildProcess.emit('close', 1)

      const result = await executionPromise

      expect(result.status).toBe('failed')
      expect(result.exitCode).toBe(1)
      expect(result.error).toBe(
        'Error: Test assertion failed\\nExpected: true, Got: false\\n',
      )
      expect(completeHandler).toHaveBeenCalledWith(result)
    })

    it('should handle spawn error', async () => {
      const runbookPath = '/test/runbook.yml'

      const completeHandler = vi.fn()
      executor.on('complete', completeHandler)

      const executionPromise = executor.execute(runbookPath)

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Simulate spawn error
      const spawnError = new Error('spawn runn ENOENT')
      mockChildProcess.emit('error', spawnError)

      try {
        await executionPromise
        expect.fail('Should have rejected')
      } catch (result) {
        expect(result.status).toBe('failed')
        expect(result.exitCode).toBe(-1)
        expect(result.error).toBe('Failed to start runn: spawn runn ENOENT')
        expect(completeHandler).toHaveBeenCalledWith(result)
      }
    })

    it('should prevent concurrent executions', async () => {
      const runbookPath1 = '/test/runbook1.yml'
      const runbookPath2 = '/test/runbook2.yml'

      // Start first execution
      const firstExecution = executor.execute(runbookPath1)

      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(executor.isRunning()).toBe(true)

      // Try to start second execution
      await expect(executor.execute(runbookPath2)).rejects.toThrow(
        'Execution already in progress',
      )

      // Complete first execution
      mockChildProcess.emit('close', 0)
      await firstExecution

      expect(executor.isRunning()).toBe(false)

      // Now second execution should be allowed
      const secondExecution = executor.execute(runbookPath2)
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(executor.isRunning()).toBe(true)

      // Complete second execution
      mockChildProcess.emit('close', 0)
      await secondExecution
    })
  })

  describe('timeout handling', () => {
    it('should handle execution timeout', async () => {
      vi.useFakeTimers()

      const runbookPath = '/test/slow-runbook.yml'
      const timeout = 1000

      const executionPromise = executor.execute(runbookPath, {}, timeout)

      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(executor.isRunning()).toBe(true)

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(timeout + 10)

      // Verify kill was called
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM')

      // Simulate process termination due to timeout
      mockChildProcess.emit('close', 143) // SIGTERM exit code

      const result = await executionPromise
      expect(result.status).toBe('failed')
      expect(result.exitCode).toBe(143)

      vi.useRealTimers()
    })

    it('should send SIGKILL after SIGTERM timeout', async () => {
      vi.useFakeTimers()

      const runbookPath = '/test/stubborn-runbook.yml'
      const timeout = 1000

      const executionPromise = executor.execute(runbookPath, {}, timeout)

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Trigger initial timeout
      vi.advanceTimersByTime(timeout + 10)
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM')

      // Advance time to trigger SIGKILL
      vi.advanceTimersByTime(5000 + 10)
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGKILL')

      // Simulate process finally terminating
      mockChildProcess.emit('close', 137) // SIGKILL exit code

      const result = await executionPromise
      expect(result.status).toBe('failed')
      expect(result.exitCode).toBe(137)

      vi.useRealTimers()
    })
  })

  describe('process management', () => {
    it('should track running state correctly', async () => {
      expect(executor.isRunning()).toBe(false)

      const executionPromise = executor.execute('/test/runbook.yml')

      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(executor.isRunning()).toBe(true)

      mockChildProcess.emit('close', 0)
      await executionPromise

      expect(executor.isRunning()).toBe(false)
    })

    it('should stop running process', async () => {
      const stoppedHandler = vi.fn()
      executor.on('stopped', stoppedHandler)

      const executionPromise = executor.execute('/test/runbook.yml')

      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(executor.isRunning()).toBe(true)

      executor.stop()

      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM')
      expect(executor.isRunning()).toBe(false)
      expect(stoppedHandler).toHaveBeenCalled()

      // Complete the execution
      mockChildProcess.emit('close', 143)
      await executionPromise
    })

    it('should handle stop when not running', () => {
      const stoppedHandler = vi.fn()
      executor.on('stopped', stoppedHandler)

      expect(executor.isRunning()).toBe(false)

      executor.stop()

      expect(mockChildProcess.kill).not.toHaveBeenCalled()
      expect(stoppedHandler).not.toHaveBeenCalled()
    })
  })

  describe('list command', () => {
    it('should execute list command successfully', async () => {
      const pattern = '**/*.yml'
      const listOutput = `ID                                         DESC                         IF    STEPS   PATH
----------------------------------------   ---------------------------  ----  ------  -----------------------------
abc123                                     Test runbook                 -     5       test.yml
def456                                     Another runbook              -     3       another.yml
ghi789                                     Complex runbook              true  10      complex/test.yml`

      // Create mock process for list command
      const listProcess = createMockChildProcess()
      mockSpawn.mockReturnValue(listProcess)

      const listPromise = executor.list(pattern)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockSpawn).toHaveBeenCalledWith(
        'runn',
        ['list', pattern, '--long'],
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env,
        }),
      )

      // Simulate successful output
      listProcess.stdout.emit('data', Buffer.from(listOutput))
      listProcess.emit('close', 0)

      const result = await listPromise

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        id: 'abc123',
        desc: 'Test runbook',
        if: '-',
        steps: 5,
        path: 'test.yml',
      })
      expect(result[1]).toEqual({
        id: 'def456',
        desc: 'Another runbook',
        if: '-',
        steps: 3,
        path: 'another.yml',
      })
      expect(result[2]).toEqual({
        id: 'ghi789',
        desc: 'Complex runbook',
        if: 'true',
        steps: 10,
        path: 'complex/test.yml',
      })
    })

    it('should handle list command failure', async () => {
      const listProcess = createMockChildProcess()
      mockSpawn.mockReturnValue(listProcess)

      const listPromise = executor.list()

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Simulate error output
      listProcess.stderr.emit('data', Buffer.from('runn: command not found'))
      listProcess.emit('close', 127)

      await expect(listPromise).rejects.toThrow(
        'Runn list failed: runn: command not found',
      )
    })

    it('should handle list spawn error', async () => {
      const listProcess = createMockChildProcess()
      mockSpawn.mockReturnValue(listProcess)

      const listPromise = executor.list()

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Simulate spawn error
      const error = new Error('spawn runn ENOENT')
      listProcess.emit('error', error)

      await expect(listPromise).rejects.toThrow(
        'Failed to run runn list: spawn runn ENOENT',
      )
    })

    it('should handle malformed list output gracefully', async () => {
      const listProcess = createMockChildProcess()
      mockSpawn.mockReturnValue(listProcess)

      const listPromise = executor.list()

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Simulate malformed output
      listProcess.stdout.emit('data', Buffer.from('invalid output format'))
      listProcess.emit('close', 0)

      const result = await listPromise
      expect(result).toEqual([])
    })
  })

  describe('static methods', () => {
    it('should check runn availability successfully', async () => {
      const versionProcess = createMockChildProcess()
      mockSpawn.mockReturnValue(versionProcess)

      const checkPromise = RunnExecutor.checkRunnAvailable()

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockSpawn).toHaveBeenCalledWith(
        'runn',
        ['--version'],
        expect.objectContaining({
          stdio: 'pipe',
          env: process.env,
        }),
      )

      versionProcess.emit('close', 0)

      const result = await checkPromise
      expect(result).toBe(true)
    })

    it('should handle runn not available', async () => {
      const versionProcess = createMockChildProcess()
      mockSpawn.mockReturnValue(versionProcess)

      const checkPromise = RunnExecutor.checkRunnAvailable()

      await new Promise((resolve) => setTimeout(resolve, 10))

      versionProcess.emit('close', 127)

      const result = await checkPromise
      expect(result).toBe(false)
    })

    it('should handle runn spawn error', async () => {
      const versionProcess = createMockChildProcess()
      mockSpawn.mockReturnValue(versionProcess)

      const checkPromise = RunnExecutor.checkRunnAvailable()

      await new Promise((resolve) => setTimeout(resolve, 10))

      const error = new Error('spawn runn ENOENT')
      versionProcess.emit('error', error)

      const result = await checkPromise
      expect(result).toBe(false)
    })
  })

  describe('environment integration', () => {
    it('should use environment manager for execution environment', async () => {
      const runbookPath = '/test/runbook.yml'

      const executionPromise = executor.execute(runbookPath)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(
        mockEnvironmentManager.getEnvironmentForExecution,
      ).toHaveBeenCalled()

      // Verify environment variables are passed to spawn
      expect(mockSpawn).toHaveBeenCalledWith(
        'runn',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            PATH: '/usr/bin:/bin',
            TEST_VAR: 'test_value',
            SECRET_KEY: 'secret123',
          }),
        }),
      )

      mockChildProcess.emit('close', 0)
      await executionPromise
    })

    it('should preserve process.env while adding managed variables', async () => {
      const _originalPath = process.env.PATH
      const runbookPath = '/test/runbook.yml'

      const executionPromise = executor.execute(runbookPath)

      await new Promise((resolve) => setTimeout(resolve, 10))

      const spawnCall = mockSpawn.mock.calls[0]
      const spawnEnv = spawnCall[2].env

      // Should include original process.env
      expect(spawnEnv).toHaveProperty('PATH')
      expect(spawnEnv).toHaveProperty('TEST_VAR', 'test_value')
      expect(spawnEnv).toHaveProperty('SECRET_KEY', 'secret123')

      mockChildProcess.emit('close', 0)
      await executionPromise
    })
  })

  describe('edge cases and data consistency', () => {
    it('should handle empty variables gracefully', async () => {
      const runbookPath = '/test/runbook.yml'

      const executionPromise = executor.execute(runbookPath, {})

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockSpawn).toHaveBeenCalledWith(
        'runn',
        ['run', runbookPath],
        expect.any(Object),
      )

      mockChildProcess.emit('close', 0)
      const result = await executionPromise

      expect(result.variables).toEqual({})
    })

    it('should handle complex variable values', async () => {
      const runbookPath = '/test/runbook.yml'
      const variables = {
        STRING_WITH_SPACES: 'value with spaces',
        STRING_WITH_QUOTES: 'value "with" quotes',
        STRING_WITH_NEWLINES: 'value\\nwith\\nnewlines',
        UNICODE_STRING: 'value with 🚀 emoji',
        SPECIAL_CHARS: 'value@#$%^&*()',
        EMPTY_STRING: '',
        ZERO_NUMBER: 0,
        FALSE_BOOLEAN: false,
      }

      const executionPromise = executor.execute(runbookPath, variables)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockSpawn).toHaveBeenCalledWith(
        'runn',
        [
          'run',
          runbookPath,
          '--var',
          'STRING_WITH_SPACES:value with spaces',
          '--var',
          'STRING_WITH_QUOTES:value "with" quotes',
          '--var',
          'STRING_WITH_NEWLINES:value\\nwith\\nnewlines',
          '--var',
          'UNICODE_STRING:value with 🚀 emoji',
          '--var',
          'SPECIAL_CHARS:value@#$%^&*()',
          '--var',
          'EMPTY_STRING:',
          '--var',
          'ZERO_NUMBER:0',
          '--var',
          'FALSE_BOOLEAN:false',
        ],
        expect.any(Object),
      )

      mockChildProcess.emit('close', 0)
      const result = await executionPromise

      expect(result.variables).toEqual(variables)
    })

    it('should handle very long output streams', async () => {
      const runbookPath = '/test/long-output.yml'

      const executionPromise = executor.execute(runbookPath)

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Simulate many output lines
      for (let i = 0; i < 1000; i++) {
        mockChildProcess.stdout.emit(
          'data',
          Buffer.from(`Line ${i}: Processing step ${i}\\n`),
        )
      }

      mockChildProcess.emit('close', 0)
      const result = await executionPromise

      expect(result.output).toHaveLength(1000)
      expect(result.output[0]).toBe('Line 0: Processing step 0')
      expect(result.output[999]).toBe('Line 999: Processing step 999')
    })

    it('should calculate duration accurately', async () => {
      const runbookPath = '/test/runbook.yml'

      const startTime = Date.now()
      const executionPromise = executor.execute(runbookPath)

      await new Promise((resolve) => setTimeout(resolve, 100))

      mockChildProcess.emit('close', 0)
      const result = await executionPromise
      const endTime = Date.now()

      expect(result.duration).toBeGreaterThan(50)
      expect(result.duration).toBeLessThan(endTime - startTime + 50)
      expect(result.endTime.getTime() - result.startTime.getTime()).toBe(
        result.duration,
      )
    })
  })

  describe('internal utility methods', () => {
    it('should generate consistent SHA-1 hash for runbook IDs', () => {
      const path = 'test/runbook.yml'

      const executorWithPrivateMethods = executor as unknown as {
        generateRunbookId: (path: string) => string
      }
      const id1 = executorWithPrivateMethods.generateRunbookId(path)
      const id2 = executorWithPrivateMethods.generateRunbookId(path)

      expect(id1).toBe(id2)
      expect(id1).toMatch(/^[a-f0-9]{40}$/) // SHA-1 hex string
    })

    it('should generate different hashes for different paths', () => {
      const path1 = 'test/runbook1.yml'
      const path2 = 'test/runbook2.yml'

      const executorWithMethods = executor as unknown as {
        generateRunbookId: (path: string) => string
      }
      const id1 = executorWithMethods.generateRunbookId(path1)
      const id2 = executorWithMethods.generateRunbookId(path2)

      expect(id1).not.toBe(id2)
    })

    it('should generate random execution IDs', () => {
      const executorWithIdGen = executor as unknown as {
        generateId: () => string
      }
      const id1 = executorWithIdGen.generateId()
      const id2 = executorWithIdGen.generateId()

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^[a-z0-9]{8}$/)
    })

    it('should parse runn list output correctly', () => {
      const output = `ID                                         DESC                         IF    STEPS   PATH
----------------------------------------   ---------------------------  ----  ------  -----------------------------
abc123                                     Test runbook                 -     5       test.yml
def456                                     Another runbook              -     3       another.yml
ghi789                                     Complex runbook              true  10      complex/test.yml`

      const executorWithParser = executor as unknown as {
        parseListOutput: (output: string) => Array<{
          id: string
          desc: string
          if: string
          steps: number
          path: string
        }>
      }
      const result = executorWithParser.parseListOutput(output)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        id: 'abc123',
        desc: 'Test runbook',
        if: '-',
        steps: 5,
        path: 'test.yml',
      })
    })
  })
})
