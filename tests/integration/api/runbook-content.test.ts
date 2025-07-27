import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock file system
const mockFs = {
  readFile: vi.fn(),
  access: vi.fn(),
}

vi.mock('node:fs/promises', () => mockFs)

describe('API Runbook Content Tests', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono()
  })

  describe('/api/runbook-content', () => {
    it('should get runbook content successfully', async () => {
      const runbookPath = '/test/sample.runbook.yml'
      const mockContent = `---
desc: Sample runbook
steps:
  - desc: Step 1
    req:
      http:
        url: https://example.com
        method: GET
`

      mockFs.access.mockResolvedValue(undefined) // File exists
      mockFs.readFile.mockResolvedValue(mockContent)

      app.get('/api/runbook-content', async (c) => {
        try {
          const runbookPath = c.req.query('path')

          if (!runbookPath) {
            return c.json(
              {
                success: false,
                error: 'Runbook path is required',
              },
              400,
            )
          }

          // Check if file exists
          await mockFs.access(runbookPath)

          // Read file content
          const content = await mockFs.readFile(runbookPath, 'utf-8')

          return c.json({
            success: true,
            data: {
              path: runbookPath,
              content,
              size: Buffer.byteLength(content, 'utf-8'),
            },
          })
        } catch (error: unknown) {
          const nodeError = error as { code?: string; message?: string }
          if (nodeError.code === 'ENOENT') {
            return c.json(
              {
                success: false,
                error: 'Runbook file not found',
              },
              404,
            )
          }

          return c.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            500,
          )
        }
      })

      const res = await app.request(
        `/api/runbook-content?path=${encodeURIComponent(runbookPath)}`,
      )
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toMatchObject({
        path: runbookPath,
        content: mockContent,
        size: expect.any(Number),
      })
      expect(mockFs.access).toHaveBeenCalledWith(runbookPath)
      expect(mockFs.readFile).toHaveBeenCalledWith(runbookPath, 'utf-8')
    })

    it('should return 400 when path is missing', async () => {
      app.get('/api/runbook-content', async (c) => {
        try {
          const runbookPath = c.req.query('path')

          if (!runbookPath) {
            return c.json(
              {
                success: false,
                error: 'Runbook path is required',
              },
              400,
            )
          }

          await mockFs.access(runbookPath)
          const content = await mockFs.readFile(runbookPath, 'utf-8')

          return c.json({
            success: true,
            data: {
              path: runbookPath,
              content,
              size: Buffer.byteLength(content, 'utf-8'),
            },
          })
        } catch (error: unknown) {
          const nodeError = error as { code?: string; message?: string }
          if (nodeError.code === 'ENOENT') {
            return c.json(
              {
                success: false,
                error: 'Runbook file not found',
              },
              404,
            )
          }

          return c.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            500,
          )
        }
      })

      const res = await app.request('/api/runbook-content')
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json).toEqual({
        success: false,
        error: 'Runbook path is required',
      })
      expect(mockFs.access).not.toHaveBeenCalled()
      expect(mockFs.readFile).not.toHaveBeenCalled()
    })

    it('should return 404 when file does not exist', async () => {
      const nonExistentPath = '/test/nonexistent.yml'
      const fileNotFoundError = Object.assign(new Error('File not found'), {
        code: 'ENOENT',
      })

      mockFs.access.mockRejectedValue(fileNotFoundError)

      app.get('/api/runbook-content', async (c) => {
        try {
          const runbookPath = c.req.query('path')

          if (!runbookPath) {
            return c.json(
              {
                success: false,
                error: 'Runbook path is required',
              },
              400,
            )
          }

          await mockFs.access(runbookPath)
          const content = await mockFs.readFile(runbookPath, 'utf-8')

          return c.json({
            success: true,
            data: {
              path: runbookPath,
              content,
              size: Buffer.byteLength(content, 'utf-8'),
            },
          })
        } catch (error: unknown) {
          const nodeError = error as { code?: string; message?: string }
          if (nodeError.code === 'ENOENT') {
            return c.json(
              {
                success: false,
                error: 'Runbook file not found',
              },
              404,
            )
          }

          return c.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            500,
          )
        }
      })

      const res = await app.request(
        `/api/runbook-content?path=${encodeURIComponent(nonExistentPath)}`,
      )
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json).toEqual({
        success: false,
        error: 'Runbook file not found',
      })
      expect(mockFs.access).toHaveBeenCalledWith(nonExistentPath)
      expect(mockFs.readFile).not.toHaveBeenCalled()
    })

    it('should handle permission errors', async () => {
      const restrictedPath = '/restricted/file.yml'
      const permissionError = Object.assign(new Error('Permission denied'), {
        code: 'EACCES',
      })

      mockFs.access.mockRejectedValue(permissionError)

      app.get('/api/runbook-content', async (c) => {
        try {
          const runbookPath = c.req.query('path')

          if (!runbookPath) {
            return c.json(
              {
                success: false,
                error: 'Runbook path is required',
              },
              400,
            )
          }

          await mockFs.access(runbookPath)
          const content = await mockFs.readFile(runbookPath, 'utf-8')

          return c.json({
            success: true,
            data: {
              path: runbookPath,
              content,
              size: Buffer.byteLength(content, 'utf-8'),
            },
          })
        } catch (error: unknown) {
          const nodeError = error as { code?: string; message?: string }
          if (nodeError.code === 'ENOENT') {
            return c.json(
              {
                success: false,
                error: 'Runbook file not found',
              },
              404,
            )
          }

          return c.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            500,
          )
        }
      })

      const res = await app.request(
        `/api/runbook-content?path=${encodeURIComponent(restrictedPath)}`,
      )
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json).toEqual({
        success: false,
        error: 'Permission denied',
      })
    })

    it('should handle large files', async () => {
      const largePath = '/test/large.yml'
      const largeContent = 'content: '.repeat(200000) // Create content larger than 1MB

      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(largeContent)

      app.get('/api/runbook-content', async (c) => {
        try {
          const runbookPath = c.req.query('path')

          if (!runbookPath) {
            return c.json(
              {
                success: false,
                error: 'Runbook path is required',
              },
              400,
            )
          }

          await mockFs.access(runbookPath)
          const content = await mockFs.readFile(runbookPath, 'utf-8')

          const size = Buffer.byteLength(content, 'utf-8')

          // Check for large files (> 1MB)
          if (size > 1024 * 1024) {
            return c.json(
              {
                success: false,
                error: 'File too large. Maximum size is 1MB.',
              },
              413,
            )
          }

          return c.json({
            success: true,
            data: {
              path: runbookPath,
              content,
              size,
            },
          })
        } catch (error: unknown) {
          const nodeError = error as { code?: string; message?: string }
          if (nodeError.code === 'ENOENT') {
            return c.json(
              {
                success: false,
                error: 'Runbook file not found',
              },
              404,
            )
          }

          return c.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            500,
          )
        }
      })

      const res = await app.request(
        `/api/runbook-content?path=${encodeURIComponent(largePath)}`,
      )
      const json = await res.json()

      expect(res.status).toBe(413)
      expect(json).toEqual({
        success: false,
        error: 'File too large. Maximum size is 1MB.',
      })
    })

    it('should handle special characters in file path', async () => {
      const specialPath = '/test/runbook with spaces & symbols!@#.yml'
      const mockContent = 'desc: Test with special chars'

      mockFs.access.mockResolvedValue(undefined)
      mockFs.readFile.mockResolvedValue(mockContent)

      app.get('/api/runbook-content', async (c) => {
        try {
          const runbookPath = c.req.query('path')

          if (!runbookPath) {
            return c.json(
              {
                success: false,
                error: 'Runbook path is required',
              },
              400,
            )
          }

          await mockFs.access(runbookPath)
          const content = await mockFs.readFile(runbookPath, 'utf-8')

          return c.json({
            success: true,
            data: {
              path: runbookPath,
              content,
              size: Buffer.byteLength(content, 'utf-8'),
            },
          })
        } catch (error: unknown) {
          const nodeError = error as { code?: string; message?: string }
          if (nodeError.code === 'ENOENT') {
            return c.json(
              {
                success: false,
                error: 'Runbook file not found',
              },
              404,
            )
          }

          return c.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            500,
          )
        }
      })

      const res = await app.request(
        `/api/runbook-content?path=${encodeURIComponent(specialPath)}`,
      )
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.path).toBe(specialPath)
      expect(json.data.content).toBe(mockContent)
      expect(mockFs.access).toHaveBeenCalledWith(specialPath)
      expect(mockFs.readFile).toHaveBeenCalledWith(specialPath, 'utf-8')
    })
  })
})
