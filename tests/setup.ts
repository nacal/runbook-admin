import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock console methods to reduce noise in tests
beforeAll(() => {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
})

// Mock environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test'
})

// Mock process.cwd() to return consistent path in tests
beforeAll(() => {
  vi.spyOn(process, 'cwd').mockReturnValue('/test/project')
})
