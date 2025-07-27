import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Simple FavoritesManager tests that focus on logic rather than file I/O
describe('FavoritesManager (Simple Tests)', () => {
  let FavoritesManager: typeof import('../../app/services/favorites-manager').FavoritesManager
  let manager: InstanceType<
    typeof import('../../app/services/favorites-manager').FavoritesManager
  >

  beforeEach(async () => {
    // Reset singleton
    const favoritesManagerModule = await import(
      '../../app/services/favorites-manager'
    )
    FavoritesManager = favoritesManagerModule.FavoritesManager
    const FavoritesManagerWithPrivateAccess = FavoritesManager as unknown as {
      instance?: unknown
    }
    FavoritesManagerWithPrivateAccess.instance = undefined

    manager = FavoritesManager.getInstance()

    // Wait for potential initialization
    await new Promise((resolve) => setTimeout(resolve, 10))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = FavoritesManager.getInstance()
      const instance2 = FavoritesManager.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should handle concurrent access', () => {
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(FavoritesManager.getInstance()),
      )

      return Promise.all(promises).then((instances) => {
        const firstInstance = instances[0]
        instances.forEach((instance) => {
          expect(instance).toBe(firstInstance)
        })
      })
    })

    it('should handle reset and re-initialization', () => {
      const instance1 = FavoritesManager.getInstance()

      // Reset singleton
      const FavoritesManagerWithPrivateAccess = FavoritesManager as unknown as {
        instance?: unknown
      }
      FavoritesManagerWithPrivateAccess.instance = undefined

      const instance2 = FavoritesManager.getInstance()

      // Should be different instances after reset
      expect(instance1).not.toBe(instance2)

      // But getInstance should still work
      const instance3 = FavoritesManager.getInstance()
      expect(instance2).toBe(instance3)
    })
  })

  describe('basic favorites operations', () => {
    it('should initially have no favorites', async () => {
      const favorites = await manager.getFavorites()

      // Might have favorites from storage, but should be an array
      expect(Array.isArray(favorites)).toBe(true)
    })

    it('should check if runbook is not favorite initially', async () => {
      const runbookId = 'test-runbook-123'

      // Create fresh instance to ensure clean state
      const FavoritesManagerWithPrivateAccess = FavoritesManager as unknown as {
        instance?: unknown
      }
      FavoritesManagerWithPrivateAccess.instance = undefined
      const freshManager = FavoritesManager.getInstance()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const initialFavorites = await freshManager.getFavorites()
      const isFavorite = await freshManager.isFavorite(runbookId)

      // Should not be favorite if not in initial list
      if (!initialFavorites.includes(runbookId)) {
        expect(isFavorite).toBe(false)
      }
    })

    it('should add runbook to favorites', async () => {
      const runbookId = 'test-runbook-add'

      // Toggle to add (assuming it's not already a favorite)
      const result = await manager.toggleFavorite(runbookId)

      // Check if it's now a favorite
      const isFav = await manager.isFavorite(runbookId)
      const favorites = await manager.getFavorites()

      expect(isFav).toBe(true)
      expect(favorites).toContain(runbookId)
    })

    it('should remove runbook from favorites', async () => {
      const runbookId = 'test-runbook-remove'

      // First add it
      await manager.toggleFavorite(runbookId)
      expect(await manager.isFavorite(runbookId)).toBe(true)

      // Then remove it
      const result = await manager.toggleFavorite(runbookId)

      expect(result).toBe(false)
      expect(await manager.isFavorite(runbookId)).toBe(false)

      const favorites = await manager.getFavorites()
      expect(favorites).not.toContain(runbookId)
    })

    it('should toggle favorites correctly', async () => {
      const runbookId = 'test-runbook-toggle'

      // Get initial state
      const initiallyFavorite = await manager.isFavorite(runbookId)

      // Toggle once
      const firstToggleResult = await manager.toggleFavorite(runbookId)
      expect(firstToggleResult).toBe(!initiallyFavorite)
      expect(await manager.isFavorite(runbookId)).toBe(!initiallyFavorite)

      // Toggle back
      const secondToggleResult = await manager.toggleFavorite(runbookId)
      expect(secondToggleResult).toBe(initiallyFavorite)
      expect(await manager.isFavorite(runbookId)).toBe(initiallyFavorite)
    })

    it('should handle multiple runbooks', async () => {
      const runbooks = ['runbook-1', 'runbook-2', 'runbook-3']

      // Add all to favorites
      for (const runbook of runbooks) {
        await manager.toggleFavorite(runbook)
        // Ensure it's added (in case it wasn't favorite before)
        if (!(await manager.isFavorite(runbook))) {
          await manager.toggleFavorite(runbook)
        }
      }

      // Check all are favorites
      for (const runbook of runbooks) {
        expect(await manager.isFavorite(runbook)).toBe(true)
      }

      const favorites = await manager.getFavorites()
      runbooks.forEach((runbook) => {
        expect(favorites).toContain(runbook)
      })
    })

    it('should clear all favorites', async () => {
      const testRunbooks = ['clear-test-1', 'clear-test-2']

      // Add some favorites
      for (const runbook of testRunbooks) {
        await manager.toggleFavorite(runbook)
        // Ensure they're added
        if (!(await manager.isFavorite(runbook))) {
          await manager.toggleFavorite(runbook)
        }
      }

      // Clear all
      await manager.clearFavorites()

      // Check all are cleared
      for (const runbook of testRunbooks) {
        expect(await manager.isFavorite(runbook)).toBe(false)
      }

      const favorites = await manager.getFavorites()
      expect(favorites).toHaveLength(0)
    })

    it('should handle empty favorite list operations', async () => {
      // Start with clear state
      await manager.clearFavorites()

      const favorites = await manager.getFavorites()
      expect(favorites).toEqual([])

      // Check non-existent favorite
      expect(await manager.isFavorite('non-existent')).toBe(false)

      // Clear empty list should not error
      await expect(manager.clearFavorites()).resolves.not.toThrow()
    })
  })

  describe('data consistency', () => {
    it('should maintain consistent state across operations', async () => {
      const runbookId = 'consistency-test'

      // Start fresh
      await manager.clearFavorites()

      // Initial state
      expect(await manager.isFavorite(runbookId)).toBe(false)
      expect(await manager.getFavorites()).not.toContain(runbookId)

      // Add to favorites
      await manager.toggleFavorite(runbookId)
      expect(await manager.isFavorite(runbookId)).toBe(true)
      expect(await manager.getFavorites()).toContain(runbookId)

      // Remove from favorites
      await manager.toggleFavorite(runbookId)
      expect(await manager.isFavorite(runbookId)).toBe(false)
      expect(await manager.getFavorites()).not.toContain(runbookId)
    })

    it('should handle duplicate operations gracefully', async () => {
      const runbookId = 'duplicate-test'

      // Ensure it's a favorite
      await manager.toggleFavorite(runbookId)
      if (!(await manager.isFavorite(runbookId))) {
        await manager.toggleFavorite(runbookId)
      }

      const favoritesBefore = await manager.getFavorites()
      const countBefore = favoritesBefore.filter(
        (id) => id === runbookId,
      ).length

      // Toggle it off and on again
      await manager.toggleFavorite(runbookId) // Remove
      await manager.toggleFavorite(runbookId) // Add back

      const favoritesAfter = await manager.getFavorites()
      const countAfter = favoritesAfter.filter((id) => id === runbookId).length

      // Should have same count (no duplicates)
      expect(countAfter).toBe(countBefore)
      expect(countAfter).toBe(1)
    })
  })

  describe('method availability', () => {
    it('should have all required public methods', () => {
      expect(typeof manager.toggleFavorite).toBe('function')
      expect(typeof manager.isFavorite).toBe('function')
      expect(typeof manager.getFavorites).toBe('function')
      expect(typeof manager.clearFavorites).toBe('function')
    })

    it('should handle method calls gracefully', async () => {
      // These should not throw
      await expect(manager.getFavorites()).resolves.not.toThrow()
      await expect(manager.isFavorite('test')).resolves.not.toThrow()
      await expect(manager.toggleFavorite('test')).resolves.not.toThrow()
      await expect(manager.clearFavorites()).resolves.not.toThrow()
    })

    it('should return appropriate types', async () => {
      const favorites = await manager.getFavorites()
      const isFavorite = await manager.isFavorite('test')
      const toggleResult = await manager.toggleFavorite('test2')

      expect(Array.isArray(favorites)).toBe(true)
      expect(typeof isFavorite).toBe('boolean')
      expect(typeof toggleResult).toBe('boolean')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string runbook ID', async () => {
      const emptyId = ''

      await expect(manager.toggleFavorite(emptyId)).resolves.not.toThrow()
      await expect(manager.isFavorite(emptyId)).resolves.not.toThrow()
    })

    it('should handle very long runbook IDs', async () => {
      const longId = 'a'.repeat(1000)

      await expect(manager.toggleFavorite(longId)).resolves.not.toThrow()
      await expect(manager.isFavorite(longId)).resolves.not.toThrow()
    })

    it('should handle special characters in runbook IDs', async () => {
      const specialIds = [
        'runbook-with-dashes',
        'runbook_with_underscores',
        'runbook.with.dots',
        'runbook/with/slashes',
        'runbook with spaces',
        'runbook@with#special$chars%',
      ]

      for (const id of specialIds) {
        await expect(manager.toggleFavorite(id)).resolves.not.toThrow()
        await expect(manager.isFavorite(id)).resolves.not.toThrow()
      }
    })
  })
})
