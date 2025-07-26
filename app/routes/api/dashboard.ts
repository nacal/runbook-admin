import { createRoute } from 'honox/factory'
import { FileScanner } from '../../services/file-scanner'
import type { Runbook } from '../../types/types'

interface DashboardData {
  runbooks: Runbook[]
  favorites: string[]
  availableLabels: string[]
  error: string | null
}

async function loadDashboardData(): Promise<DashboardData> {
  try {
    const projectPath = process.cwd()
    const scanner = new FileScanner(projectPath)
    const runbooks = await scanner.scanRunbooks()

    // Favorites読み込み
    let favorites: string[] = []
    try {
      const { readFile } = await import('fs/promises')
      const { join } = await import('path')
      const favoritesPath = join(projectPath, '.runbook-favorites.json')
      const favoritesData = await readFile(favoritesPath, 'utf-8')
      favorites = JSON.parse(favoritesData)
    } catch {
      // favoritesファイルがない場合は空配列
      favorites = []
    }

    // Available labels抽出
    const availableLabels = Array.from(
      new Set(runbooks.flatMap((r) => r.labels || [])),
    ).sort()

    return {
      runbooks,
      favorites,
      availableLabels,
      error: null,
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error occurred'
    return {
      runbooks: [],
      favorites: [],
      availableLabels: [],
      error: errorMessage,
    }
  }
}

export default createRoute(async (c) => {
  try {
    const dashboardData = await loadDashboardData()

    return c.json({
      success: true,
      data: dashboardData,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})
