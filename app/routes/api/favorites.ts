import { createRoute } from 'honox/factory'
import { FavoritesManager } from '../../services/favorites-manager'

// Get all favorites
export const GET = createRoute(async (c) => {
  try {
    const manager = FavoritesManager.getInstance()
    const favorites = await manager.getFavorites()

    return c.json({
      success: true,
      data: favorites,
      count: favorites.length,
    })
  } catch (error) {
    console.error('Error fetching favorites:', error)
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

// Toggle favorite
export const POST = createRoute(async (c) => {
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

    const manager = FavoritesManager.getInstance()
    const isFavorite = await manager.toggleFavorite(runbookId)

    return c.json({
      success: true,
      isFavorite,
      message: isFavorite ? 'Added to favorites' : 'Removed from favorites',
    })
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

// Clear all favorites
export const DELETE = createRoute(async (c) => {
  try {
    const manager = FavoritesManager.getInstance()
    await manager.clearFavorites()

    return c.json({
      success: true,
      message: 'All favorites cleared',
    })
  } catch (error) {
    console.error('Error clearing favorites:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})
