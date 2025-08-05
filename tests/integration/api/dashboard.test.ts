import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock services
const mockFileScanner = {
  scanRunbooks: vi.fn(),
}

const mockFavoritesManager = {
  getFavorites: vi.fn(),
}

const mockExecutionManager = {
  getRecentExecutions: vi.fn(),
  getExecutionStats: vi.fn(),
}

vi.mock('../../../app/services/file-scanner', () => ({
  FileScanner: vi.fn().mockImplementation(() => mockFileScanner),
}))

vi.mock('../../../app/services/favorites-manager', () => ({
  FavoritesManager: {
    getInstance: vi.fn(() => mockFavoritesManager),
  },
}))

vi.mock('../../../app/services/execution-manager', () => ({
  ExecutionManager: {
    getInstance: vi.fn(() => mockExecutionManager),
  },
}))

describe('API Dashboard Tests', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono()
  })

  describe('/api/dashboard', () => {
    it('should return dashboard data successfully', async () => {
      const mockRunbooks = [
        {
          id: 'runbook-1',
          path: 'test/book1.yml',
          name: 'Book 1',
          description: 'Test book 1',
          steps: 5,
          lastModified: new Date('2024-01-01'),
          variables: {},
          labels: ['test'],
        },
        {
          id: 'runbook-2',
          path: 'test/book2.yml',
          name: 'Book 2',
          description: 'Test book 2',
          steps: 3,
          lastModified: new Date('2024-01-02'),
          variables: {},
          labels: ['prod'],
        },
      ]

      const mockFavorites = ['runbook-1']
      const mockRecentExecutions = [
        {
          id: 'exec-1',
          runbookId: 'runbook-1',
          startTime: new Date('2024-01-03T10:00:00Z'),
          status: 'completed',
        },
      ]

      const mockStats = {
        totalExecutions: 15,
        successfulExecutions: 12,
        failedExecutions: 3,
        averageExecutionTime: 45.2,
      }

      mockFileScanner.scanRunbooks.mockResolvedValue(mockRunbooks)
      mockFavoritesManager.getFavorites.mockResolvedValue(mockFavorites)
      mockExecutionManager.getRecentExecutions.mockResolvedValue(
        mockRecentExecutions,
      )
      mockExecutionManager.getExecutionStats.mockResolvedValue(mockStats)

      app.get('/api/dashboard', async (c) => {
        try {
          const projectPath = c.req.query('path') || process.cwd()

          const [runbooks, favorites, recentExecutions, stats] =
            await Promise.all([
              mockFileScanner.scanRunbooks(),
              mockFavoritesManager.getFavorites(),
              mockExecutionManager.getRecentExecutions(10),
              mockExecutionManager.getExecutionStats(),
            ])

          return c.json({
            success: true,
            data: {
              projectPath,
              runbooks: {
                items: runbooks,
                count: runbooks.length,
              },
              favorites: {
                items: favorites,
                count: favorites.length,
              },
              recentExecutions: {
                items: recentExecutions,
                count: recentExecutions.length,
              },
              stats,
            },
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

      const res = await app.request('/api/dashboard')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toMatchObject({
        projectPath: process.cwd(),
        runbooks: {
          count: 2,
        },
        favorites: {
          items: ['runbook-1'],
          count: 1,
        },
        recentExecutions: {
          count: 1,
        },
        stats: {
          totalExecutions: 15,
          successfulExecutions: 12,
          failedExecutions: 3,
          averageExecutionTime: 45.2,
        },
      })

      expect(mockFileScanner.scanRunbooks).toHaveBeenCalled()
      expect(mockFavoritesManager.getFavorites).toHaveBeenCalled()
      expect(mockExecutionManager.getRecentExecutions).toHaveBeenCalledWith(10)
      expect(mockExecutionManager.getExecutionStats).toHaveBeenCalled()
    })

    it('should handle errors in dashboard data fetching', async () => {
      const errorMessage = 'Failed to fetch dashboard data'
      mockFileScanner.scanRunbooks.mockRejectedValue(new Error(errorMessage))

      app.get('/api/dashboard', async (c) => {
        try {
          const projectPath = c.req.query('path') || process.cwd()

          const [runbooks, favorites, recentExecutions, stats] =
            await Promise.all([
              mockFileScanner.scanRunbooks(),
              mockFavoritesManager.getFavorites(),
              mockExecutionManager.getRecentExecutions(10),
              mockExecutionManager.getExecutionStats(),
            ])

          return c.json({
            success: true,
            data: {
              projectPath,
              runbooks: {
                items: runbooks,
                count: runbooks.length,
              },
              favorites: {
                items: favorites,
                count: favorites.length,
              },
              recentExecutions: {
                items: recentExecutions,
                count: recentExecutions.length,
              },
              stats,
            },
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

      const res = await app.request('/api/dashboard')
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json).toEqual({
        success: false,
        error: errorMessage,
      })
    })

    it('should handle partial service failures gracefully', async () => {
      // Simulate one service failing while others succeed
      const mockRunbooks: Array<unknown> = []
      const mockFavorites: Array<string> = []

      mockFileScanner.scanRunbooks.mockResolvedValue(mockRunbooks)
      mockFavoritesManager.getFavorites.mockResolvedValue(mockFavorites)
      mockExecutionManager.getRecentExecutions.mockRejectedValue(
        new Error('Execution service unavailable'),
      )
      mockExecutionManager.getExecutionStats.mockResolvedValue({
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
      })

      app.get('/api/dashboard', async (c) => {
        try {
          const projectPath = c.req.query('path') || process.cwd()

          // Handle partial failures gracefully
          const [
            runbooksResult,
            favoritesResult,
            executionsResult,
            statsResult,
          ] = await Promise.allSettled([
            mockFileScanner.scanRunbooks(),
            mockFavoritesManager.getFavorites(),
            mockExecutionManager.getRecentExecutions(10),
            mockExecutionManager.getExecutionStats(),
          ])

          const runbooks =
            runbooksResult.status === 'fulfilled' ? runbooksResult.value : []
          const favorites =
            favoritesResult.status === 'fulfilled' ? favoritesResult.value : []
          const recentExecutions =
            executionsResult.status === 'fulfilled'
              ? executionsResult.value
              : []
          const stats =
            statsResult.status === 'fulfilled'
              ? statsResult.value
              : {
                  totalExecutions: 0,
                  successfulExecutions: 0,
                  failedExecutions: 0,
                  averageExecutionTime: 0,
                }

          const errors = [
            runbooksResult,
            favoritesResult,
            executionsResult,
            statsResult,
          ]
            .filter((result) => result.status === 'rejected')
            .map((result) => result.reason?.message || 'Unknown error')

          return c.json({
            success: true,
            data: {
              projectPath,
              runbooks: {
                items: runbooks,
                count: runbooks.length,
              },
              favorites: {
                items: favorites,
                count: favorites.length,
              },
              recentExecutions: {
                items: recentExecutions,
                count: recentExecutions.length,
              },
              stats,
            },
            warnings: errors.length > 0 ? errors : undefined,
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

      const res = await app.request('/api/dashboard')
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.warnings).toEqual(['Execution service unavailable'])
      expect(json.data.recentExecutions.count).toBe(0)
    })
  })
})
