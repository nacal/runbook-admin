import { RunbookList } from '@/islands/RunbookList'
import { FavoritesManager } from '@/services/favorites-manager'
import { FileScanner } from '@/services/file-scanner'
import type { Runbook } from '@/types/types'
import { getProjectPath } from '@/utils/project-context'

interface DashboardData {
  runbooks: Runbook[]
  favorites: string[]
  availableLabels: string[]
  error: string | null
}

async function loadDashboardData(): Promise<DashboardData> {
  try {
    const projectPath = getProjectPath()
    const scanner = new FileScanner(projectPath)
    const runbooks = await scanner.scanRunbooks()

    // Favorites読み込み
    const favoritesManager = FavoritesManager.getInstance()
    const favorites = await favoritesManager.getFavorites()

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

export async function DashboardContent() {
  const dashboardData = await loadDashboardData()

  return (
    <RunbookList
      runbooks={dashboardData.runbooks}
      favorites={dashboardData.favorites}
      availableLabels={dashboardData.availableLabels}
      error={dashboardData.error}
    />
  )
}
