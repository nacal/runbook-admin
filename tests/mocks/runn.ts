import { vi } from 'vitest'
import type { ExecutionResult } from '../../app/types/types'

// Mock Runn CLI responses
export const mockRunnExecutionResult: ExecutionResult = {
  id: 'test-execution-123',
  runbookId: 'test-runbook-1',
  runbookPath: 'test/sample.runbook.yml',
  status: 'success',
  startTime: new Date('2024-01-01T10:00:00Z'),
  endTime: new Date('2024-01-01T10:01:00Z'),
  duration: 60000,
  exitCode: 0,
  output: [
    'Running runbook: test/sample.runbook.yml',
    'Step 1: Executing HTTP request',
    'Step 2: Running command',
    'Step 3: Validating results',
    'All steps completed successfully',
  ],
  error: undefined,
  variables: {
    TEST_VAR: 'test-value',
    OPTIONAL_VAR: 'optional-value',
  },
}

export const mockRunnFailedResult: ExecutionResult = {
  id: 'test-execution-456',
  runbookId: 'test-runbook-2',
  runbookPath: 'test/failing.runbook.yml',
  status: 'failed',
  startTime: new Date('2024-01-01T10:00:00Z'),
  endTime: new Date('2024-01-01T10:00:30Z'),
  duration: 30000,
  exitCode: 1,
  output: [
    'Running runbook: test/failing.runbook.yml',
    'Step 1: Executing HTTP request',
    'Error: Connection failed',
  ],
  error: 'HTTP request failed: Connection timeout',
  variables: {
    TEST_VAR: 'test-value',
  },
}

// Mock child_process.spawn for Runn CLI
export const mockSpawn = vi.fn()

export const createMockProcess = (
  exitCode = 0,
  stdout = 'success',
  stderr = '',
) => {
  const mockProcess = {
    stdout: {
      on: vi.fn((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(stdout)), 10)
        }
      }),
    },
    stderr: {
      on: vi.fn((event, callback) => {
        if (event === 'data' && stderr) {
          setTimeout(() => callback(Buffer.from(stderr)), 10)
        }
      }),
    },
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(exitCode), 20)
      }
    }),
    kill: vi.fn(),
  }
  return mockProcess
}

export const setupRunnMocks = () => {
  mockSpawn.mockImplementation(() => createMockProcess(0, 'Test output'))
}