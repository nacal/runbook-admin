import { Storage } from './storage'

export class FavoritesManager {
  private static instance: FavoritesManager
  private favorites = new Set<string>()
  private storage = Storage.getInstance()
  private initialized = false

  private constructor() {
    this.initializeFromStorage()
  }

  static getInstance(): FavoritesManager {
    if (!FavoritesManager.instance) {
      FavoritesManager.instance = new FavoritesManager()
    }
    return FavoritesManager.instance
  }

  private async initializeFromStorage(): Promise<void> {
    if (this.initialized) return

    try {
      const saved = await this.storage.loadFavorites()
      saved.forEach((id) => this.favorites.add(id))
      this.initialized = true
      console.log(
        `[FavoritesManager] Loaded ${saved.length} favorites from storage`,
      )
    } catch (error) {
      console.error(
        '[FavoritesManager] Failed to initialize from storage:',
        error,
      )
      this.initialized = true
    }
  }

  private async persistToStorage(): Promise<void> {
    try {
      const favoritesList = Array.from(this.favorites)
      await this.storage.saveFavorites(favoritesList)
    } catch (error) {
      console.error('[FavoritesManager] Failed to persist to storage:', error)
    }
  }

  async toggleFavorite(runbookId: string): Promise<boolean> {
    await this.initializeFromStorage()

    if (this.favorites.has(runbookId)) {
      this.favorites.delete(runbookId)
      console.log(`[FavoritesManager] Removed ${runbookId} from favorites`)
    } else {
      this.favorites.add(runbookId)
      console.log(`[FavoritesManager] Added ${runbookId} to favorites`)
    }

    await this.persistToStorage()
    return this.favorites.has(runbookId)
  }

  async isFavorite(runbookId: string): Promise<boolean> {
    await this.initializeFromStorage()
    return this.favorites.has(runbookId)
  }

  async getFavorites(): Promise<string[]> {
    await this.initializeFromStorage()
    return Array.from(this.favorites)
  }

  async clearFavorites(): Promise<void> {
    this.favorites.clear()
    await this.persistToStorage()
    console.log('[FavoritesManager] Cleared all favorites')
  }
}
