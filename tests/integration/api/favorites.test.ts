import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock FavoritesManager
const mockFavoritesManager = {
  getFavorites: vi.fn(),
  toggleFavorite: vi.fn(),
  clearFavorites: vi.fn(),
}

vi.mock('../../../app/services/favorites-manager', () => ({
  FavoritesManager: {
    getInstance: vi.fn(() => mockFavoritesManager),
  },
}))

describe('/api/favorites API Complete Tests', () => {
  let GET: (context: unknown) => Promise<unknown>
  let POST: (context: unknown) => Promise<unknown>
  let DELETE: (context: unknown) => Promise<unknown>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset modules and import handlers
    vi.resetModules()
    const favoritesModule = await import('../../../app/routes/api/favorites')
    GET = favoritesModule.GET
    POST = favoritesModule.POST
    DELETE = favoritesModule.DELETE
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/favorites', () => {
    it('should return favorites successfully', async () => {
      const mockFavorites = ['runbook-1', 'runbook-2', 'runbook-3']
      mockFavoritesManager.getFavorites.mockResolvedValue(mockFavorites)

      const mockContext = {
        json: vi.fn().mockImplementation((data) => ({
          json: data,
          status: 200,
        })),
      }

      const _response = await GET(mockContext)

      expect(mockFavoritesManager.getFavorites).toHaveBeenCalled()
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        data: mockFavorites,
        count: 3,
      })
    })

    it('should return empty array when no favorites', async () => {
      mockFavoritesManager.getFavorites.mockResolvedValue([])

      const mockContext = {
        json: vi.fn().mockImplementation((data) => ({
          json: data,
          status: 200,
        })),
      }

      const _response = await GET(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0,
      })
    })

    it('should handle getFavorites error', async () => {
      const errorMessage = 'Failed to load favorites'
      mockFavoritesManager.getFavorites.mockRejectedValue(
        new Error(errorMessage),
      )

      const mockContext = {
        json: vi.fn().mockImplementation((data, status) => ({
          json: data,
          status: status || 200,
        })),
      }

      const _response = await GET(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: errorMessage,
          data: [],
          count: 0,
        },
        500,
      )
    })

    it('should handle non-Error exceptions in GET', async () => {
      mockFavoritesManager.getFavorites.mockRejectedValue('String error')

      const mockContext = {
        json: vi.fn().mockImplementation((data, status) => ({
          json: data,
          status: status || 200,
        })),
      }

      const _response = await GET(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Unknown error',
          data: [],
          count: 0,
        },
        500,
      )
    })
  })

  describe('POST /api/favorites', () => {
    it('should toggle favorite successfully (add)', async () => {
      const runbookId = 'test-runbook-1'
      mockFavoritesManager.toggleFavorite.mockResolvedValue(true)

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({ runbookId }),
        },
        json: vi.fn().mockImplementation((data) => ({
          json: data,
          status: 200,
        })),
      }

      const _response = await POST(mockContext)

      expect(mockContext.req.json).toHaveBeenCalled()
      expect(mockFavoritesManager.toggleFavorite).toHaveBeenCalledWith(
        runbookId,
      )
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        isFavorite: true,
        message: 'Added to favorites',
      })
    })

    it('should toggle favorite successfully (remove)', async () => {
      const runbookId = 'test-runbook-2'
      mockFavoritesManager.toggleFavorite.mockResolvedValue(false)

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({ runbookId }),
        },
        json: vi.fn().mockImplementation((data) => ({
          json: data,
          status: 200,
        })),
      }

      const _response = await POST(mockContext)

      expect(mockFavoritesManager.toggleFavorite).toHaveBeenCalledWith(
        runbookId,
      )
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        isFavorite: false,
        message: 'Removed from favorites',
      })
    })

    it('should return 400 when runbookId is missing', async () => {
      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({}), // No runbookId
        },
        json: vi.fn().mockImplementation((data, status) => ({
          json: data,
          status: status || 200,
        })),
      }

      const _response = await POST(mockContext)

      expect(mockFavoritesManager.toggleFavorite).not.toHaveBeenCalled()
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'runbookId is required',
        },
        400,
      )
    })

    it('should return 400 when runbookId is empty string', async () => {
      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({ runbookId: '' }),
        },
        json: vi.fn().mockImplementation((data, status) => ({
          json: data,
          status: status || 200,
        })),
      }

      const _response = await POST(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'runbookId is required',
        },
        400,
      )
    })

    it('should return 400 when runbookId is null', async () => {
      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({ runbookId: null }),
        },
        json: vi.fn().mockImplementation((data, status) => ({
          json: data,
          status: status || 200,
        })),
      }

      const _response = await POST(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'runbookId is required',
        },
        400,
      )
    })

    it('should handle toggle favorite error', async () => {
      const runbookId = 'test-runbook-error'
      const errorMessage = 'Failed to toggle favorite'
      mockFavoritesManager.toggleFavorite.mockRejectedValue(
        new Error(errorMessage),
      )

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({ runbookId }),
        },
        json: vi.fn().mockImplementation((data, status) => ({
          json: data,
          status: status || 200,
        })),
      }

      const _response = await POST(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: errorMessage,
        },
        500,
      )
    })

    it('should handle request parsing error', async () => {
      const mockContext = {
        req: {
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        },
        json: vi.fn().mockImplementation((data, status) => ({
          json: data,
          status: status || 200,
        })),
      }

      const _response = await POST(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Invalid JSON',
        },
        500,
      )
    })

    it('should handle special characters in runbookId', async () => {
      const specialRunbookId = 'runbook@#$%^&*()_with-special-chars/path'
      mockFavoritesManager.toggleFavorite.mockResolvedValue(true)

      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({ runbookId: specialRunbookId }),
        },
        json: vi.fn().mockImplementation((data) => ({
          json: data,
          status: 200,
        })),
      }

      const _response = await POST(mockContext)

      expect(mockFavoritesManager.toggleFavorite).toHaveBeenCalledWith(
        specialRunbookId,
      )
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        isFavorite: true,
        message: 'Added to favorites',
      })
    })
  })

  describe('DELETE /api/favorites', () => {
    it('should clear all favorites successfully', async () => {
      mockFavoritesManager.clearFavorites.mockResolvedValue(undefined)

      const mockContext = {
        json: vi.fn().mockImplementation((data) => ({
          json: data,
          status: 200,
        })),
      }

      const _response = await DELETE(mockContext)

      expect(mockFavoritesManager.clearFavorites).toHaveBeenCalled()
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        message: 'All favorites cleared',
      })
    })

    it('should handle clear favorites error', async () => {
      const errorMessage = 'Failed to clear favorites'
      mockFavoritesManager.clearFavorites.mockRejectedValue(
        new Error(errorMessage),
      )

      const mockContext = {
        json: vi.fn().mockImplementation((data, status) => ({
          json: data,
          status: status || 200,
        })),
      }

      const _response = await DELETE(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: errorMessage,
        },
        500,
      )
    })

    it('should handle non-Error exceptions in DELETE', async () => {
      mockFavoritesManager.clearFavorites.mockRejectedValue('Unexpected error')

      const mockContext = {
        json: vi.fn().mockImplementation((data, status) => ({
          json: data,
          status: status || 200,
        })),
      }

      const _response = await DELETE(mockContext)

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Unknown error',
        },
        500,
      )
    })
  })

  describe('Integration scenarios', () => {
    it('should handle multiple operations in sequence', async () => {
      // Simulate a sequence of operations: GET -> POST -> GET -> DELETE -> GET

      // Initial GET - empty favorites
      mockFavoritesManager.getFavorites.mockResolvedValueOnce([])

      const getContext1 = {
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      await GET(getContext1)
      expect(getContext1.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0,
      })

      // POST - add favorite
      mockFavoritesManager.toggleFavorite.mockResolvedValueOnce(true)

      const postContext = {
        req: { json: vi.fn().mockResolvedValue({ runbookId: 'test-runbook' }) },
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      await POST(postContext)
      expect(postContext.json).toHaveBeenCalledWith({
        success: true,
        isFavorite: true,
        message: 'Added to favorites',
      })

      // Second GET - with favorite
      mockFavoritesManager.getFavorites.mockResolvedValueOnce(['test-runbook'])

      const getContext2 = {
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      await GET(getContext2)
      expect(getContext2.json).toHaveBeenCalledWith({
        success: true,
        data: ['test-runbook'],
        count: 1,
      })

      // DELETE - clear all
      mockFavoritesManager.clearFavorites.mockResolvedValueOnce(undefined)

      const deleteContext = {
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      await DELETE(deleteContext)
      expect(deleteContext.json).toHaveBeenCalledWith({
        success: true,
        message: 'All favorites cleared',
      })

      // Final GET - empty again
      mockFavoritesManager.getFavorites.mockResolvedValueOnce([])

      const getContext3 = {
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }

      await GET(getContext3)
      expect(getContext3.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0,
      })
    })

    it('should handle concurrent requests simulation', async () => {
      // Simulate multiple concurrent toggle requests
      const runbookIds = ['book1', 'book2', 'book3']

      // Mock all toggles to return true (add to favorites)
      mockFavoritesManager.toggleFavorite.mockResolvedValue(true)

      const contexts = runbookIds.map((id) => ({
        req: { json: vi.fn().mockResolvedValue({ runbookId: id }) },
        json: vi
          .fn()
          .mockImplementation((data) => ({ json: data, status: 200 })),
      }))

      // Execute all POST requests concurrently
      const _results = await Promise.all(
        contexts.map((context) => POST(context)),
      )

      // Verify all succeeded
      contexts.forEach((context) => {
        expect(context.json).toHaveBeenCalledWith({
          success: true,
          isFavorite: true,
          message: 'Added to favorites',
        })
      })

      // Verify all runbook IDs were processed
      runbookIds.forEach((id) => {
        expect(mockFavoritesManager.toggleFavorite).toHaveBeenCalledWith(id)
      })
    })
  })
})
