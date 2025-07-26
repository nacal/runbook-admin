import { RunbookList } from '../islands/RunbookList'
import { FileScanner } from '../services/file-scanner'
import type { Runbook } from '../types/types'

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
      const { readFile } = await import('node:fs/promises')
      const { join } = await import('node:path')
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

export async function DashboardContent() {
  console.log('📄 Loading dashboard data...')

  const dashboardData = await loadDashboardData()

  if (dashboardData.error) {
    console.error('❌ Dashboard data loading failed:', {
      error: dashboardData.error,
      projectPath: process.cwd(),
      timestamp: new Date().toISOString(),
    })
  } else {
    console.log(`✅ Dashboard data loaded successfully`, {
      runbooksCount: dashboardData.runbooks.length,
      favoritesCount: dashboardData.favorites.length,
      labelsCount: dashboardData.availableLabels.length,
      labels: dashboardData.availableLabels,
      projectPath: process.cwd(),
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <RunbookList
      runbooks={dashboardData.runbooks}
      favorites={dashboardData.favorites}
      availableLabels={dashboardData.availableLabels}
      error={dashboardData.error}
    />
  )
}
