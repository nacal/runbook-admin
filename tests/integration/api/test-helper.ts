import { vi } from 'vitest'

// Helper to debug HonoX route imports and test patterns

export async function debugRouteImport(modulePath: string) {
  console.log(`\n=== Debugging ${modulePath} ===`)

  try {
    const module = await import(modulePath)
    console.log('Module keys:', Object.keys(module))

    for (const [key, value] of Object.entries(module)) {
      console.log(`${key}:`, typeof value, value?.constructor?.name)

      if (typeof value === 'function') {
        console.log(`  Function ${key} length:`, value.length)
        console.log(
          `  Function ${key} string:`,
          `${value.toString().substring(0, 200)}...`,
        )
      }
    }
  } catch (error) {
    console.log('Import error:', error)
  }
}

// Test if a function looks like a HonoX route handler
export function isValidRouteHandler(handler: unknown): boolean {
  return typeof handler === 'function' && handler.length >= 1
}

// Create a mock Hono context
export function createMockContext(
  options: {
    method?: string
    path?: string
    query?: Record<string, string>
    json?: unknown
    headers?: Record<string, string>
  } = {},
) {
  const mockContext = {
    req: {
      method: options.method || 'GET',
      path: options.path || '/',
      query: vi.fn((key: string) => options.query?.[key]),
      json: vi.fn().mockResolvedValue(options.json || {}),
      header: vi.fn((key: string) => options.headers?.[key]),
      url: `http://localhost:3000${options.path || '/'}`,
    },
    res: {},
    json: vi.fn().mockImplementation((data, status) => ({
      json: data,
      status: status || 200,
      headers: { 'Content-Type': 'application/json' },
    })),
    text: vi.fn().mockImplementation((text, status) => ({
      text,
      status: status || 200,
      headers: { 'Content-Type': 'text/plain' },
    })),
    status: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockImplementation((url) => ({
      status: 302,
      headers: { Location: url },
    })),
  }

  return mockContext
}
