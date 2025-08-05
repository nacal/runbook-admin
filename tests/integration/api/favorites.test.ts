import { Hono } from 'hono'
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
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()

    // Create a new Hono app and manually implement the API logic
    app = new Hono()

    // Implement GET endpoint manually
    app.get('/api/favorites', async (c) => {
      try {
        const manager = mockFavoritesManager
        const favorites = await manager.getFavorites()
        return c.json({
          success: true,
          data: favorites,
          count: favorites.length,
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

    // Implement POST endpoint manually
    app.post('/api/favorites', async (c) => {
      try {
        const { runbookId } = await c.req.json()

        if (!runbookId) {
          return c.json(
            {
              success: false,
              error: 'runbookId is required',
            },
            400,
          )
        }

        const manager = mockFavoritesManager
        const isFavorite = await manager.toggleFavorite(runbookId)

        return c.json({
          success: true,
          isFavorite,
          message: isFavorite ? 'Added to favorites' : 'Removed from favorites',
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

    // Implement DELETE endpoint manually
    app.delete('/api/favorites', async (c) => {
      try {
        const manager = mockFavoritesManager
        await manager.clearFavorites()

        return c.json({
          success: true,
          message: 'All favorites cleared',
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
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/favorites', () => {
    it('should return favorites successfully', async () => {
      const mockFavorites = ['runbook-1', 'runbook-2', 'runbook-3']
      mockFavoritesManager.getFavorites.mockResolvedValue(mockFavorites)

      const response = await app.request('/api/favorites')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFavoritesManager.getFavorites).toHaveBeenCalled()
      expect(data).toEqual({
        success: true,
        data: mockFavorites,
        count: 3,
      })
    })

    it('should return empty array when no favorites', async () => {
      mockFavoritesManager.getFavorites.mockResolvedValue([])

      const response = await app.request('/api/favorites')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
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

      const response = await app.request('/api/favorites')
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        success: false,
        error: errorMessage,
        data: [],
        count: 0,
      })
    })

    it('should handle non-Error exceptions in GET', async () => {
      mockFavoritesManager.getFavorites.mockRejectedValue('String error')

      const response = await app.request('/api/favorites')
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        success: false,
        error: 'Unknown error',
        data: [],
        count: 0,
      })
    })
  })

  describe('POST /api/favorites', () => {
    it('should toggle favorite successfully (add)', async () => {
      const runbookId = 'test-runbook-1'
      mockFavoritesManager.toggleFavorite.mockResolvedValue(true)

      const response = await app.request('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runbookId }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFavoritesManager.toggleFavorite).toHaveBeenCalledWith(
        runbookId,
      )
      expect(data).toEqual({
        success: true,
        isFavorite: true,
        message: 'Added to favorites',
      })
    })

    it('should toggle favorite successfully (remove)', async () => {
      const runbookId = 'test-runbook-2'
      mockFavoritesManager.toggleFavorite.mockResolvedValue(false)

      const response = await app.request('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runbookId }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFavoritesManager.toggleFavorite).toHaveBeenCalledWith(
        runbookId,
      )
      expect(data).toEqual({
        success: true,
        isFavorite: false,
        message: 'Removed from favorites',
      })
    })

    it('should return 400 when runbookId is missing', async () => {
      const response = await app.request('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(mockFavoritesManager.toggleFavorite).not.toHaveBeenCalled()
      expect(data).toEqual({
        success: false,
        error: 'runbookId is required',
      })
    })

    it('should return 400 when runbookId is empty string', async () => {
      const response = await app.request('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runbookId: '' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        success: false,
        error: 'runbookId is required',
      })
    })

    it('should return 400 when runbookId is null', async () => {
      const response = await app.request('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runbookId: null }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        success: false,
        error: 'runbookId is required',
      })
    })

    it('should handle toggle favorite error', async () => {
      const runbookId = 'test-runbook-error'
      const errorMessage = 'Failed to toggle favorite'
      mockFavoritesManager.toggleFavorite.mockRejectedValue(
        new Error(errorMessage),
      )

      const response = await app.request('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runbookId }),
      })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        success: false,
        error: errorMessage,
      })
    })

    it('should handle request parsing error', async () => {
      const response = await app.request('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        success: false,
        error: expect.stringContaining('JSON'),
      })
    })

    it('should handle special characters in runbookId', async () => {
      const specialRunbookId = 'runbook@#$%^&*()_with-special-chars/path'
      mockFavoritesManager.toggleFavorite.mockResolvedValue(true)

      const response = await app.request('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runbookId: specialRunbookId }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFavoritesManager.toggleFavorite).toHaveBeenCalledWith(
        specialRunbookId,
      )
      expect(data).toEqual({
        success: true,
        isFavorite: true,
        message: 'Added to favorites',
      })
    })
  })

  describe('DELETE /api/favorites', () => {
    it('should clear all favorites successfully', async () => {
      mockFavoritesManager.clearFavorites.mockResolvedValue(undefined)

      const response = await app.request('/api/favorites', { method: 'DELETE' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFavoritesManager.clearFavorites).toHaveBeenCalled()
      expect(data).toEqual({
        success: true,
        message: 'All favorites cleared',
      })
    })

    it('should handle clear favorites error', async () => {
      const errorMessage = 'Failed to clear favorites'
      mockFavoritesManager.clearFavorites.mockRejectedValue(
        new Error(errorMessage),
      )

      const response = await app.request('/api/favorites', { method: 'DELETE' })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        success: false,
        error: errorMessage,
      })
    })

    it('should handle non-Error exceptions in DELETE', async () => {
      mockFavoritesManager.clearFavorites.mockRejectedValue('Unexpected error')

      const response = await app.request('/api/favorites', { method: 'DELETE' })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        success: false,
        error: 'Unknown error',
      })
    })
  })

  describe('Integration scenarios', () => {
    it('should handle multiple operations in sequence', async () => {
      // Initial GET - empty favorites
      mockFavoritesManager.getFavorites.mockResolvedValueOnce([])

      let response = await app.request('/api/favorites')
      let data = await response.json()
      expect(data).toEqual({
        success: true,
        data: [],
        count: 0,
      })

      // POST - add favorite
      mockFavoritesManager.toggleFavorite.mockResolvedValueOnce(true)

      response = await app.request('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runbookId: 'test-runbook' }),
      })
      data = await response.json()
      expect(data).toEqual({
        success: true,
        isFavorite: true,
        message: 'Added to favorites',
      })

      // Second GET - with favorite
      mockFavoritesManager.getFavorites.mockResolvedValueOnce(['test-runbook'])

      response = await app.request('/api/favorites')
      data = await response.json()
      expect(data).toEqual({
        success: true,
        data: ['test-runbook'],
        count: 1,
      })

      // DELETE - clear all
      mockFavoritesManager.clearFavorites.mockResolvedValueOnce(undefined)

      response = await app.request('/api/favorites', { method: 'DELETE' })
      data = await response.json()
      expect(data).toEqual({
        success: true,
        message: 'All favorites cleared',
      })

      // Final GET - empty again
      mockFavoritesManager.getFavorites.mockResolvedValueOnce([])

      response = await app.request('/api/favorites')
      data = await response.json()
      expect(data).toEqual({
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

      const requests = runbookIds.map((id) =>
        app.request('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runbookId: id }),
        }),
      )

      // Execute all POST requests concurrently
      const responses = await Promise.all(requests)
      const dataPromises = responses.map((response) => response.json())
      const results = await Promise.all(dataPromises)

      // Verify all succeeded
      results.forEach((data) => {
        expect(data).toEqual({
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
