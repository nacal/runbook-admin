import { createRoute } from 'honox/factory'
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
      new Set(runbooks.flatMap(r => r.labels || []))
    ).sort()
    
    return {
      runbooks,
      favorites,
      availableLabels,
      error: null
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    return {
      runbooks: [],
      favorites: [],
      availableLabels: [],
      error: errorMessage
    }
  }
}

export default createRoute(async (c) => {
  console.log('📄 Loading dashboard data...')
  
  // データ取得の実行
  const dashboardData = await loadDashboardData()
  
  if (dashboardData.error) {
    console.error('❌ Dashboard data loading failed:', {
      error: dashboardData.error,
      projectPath: process.cwd(),
      timestamp: new Date().toISOString()
    })
  } else {
    console.log(`✅ Dashboard data loaded successfully`, {
      runbooksCount: dashboardData.runbooks.length,
      favoritesCount: dashboardData.favorites.length,
      labelsCount: dashboardData.availableLabels.length,
      labels: dashboardData.availableLabels,
      projectPath: process.cwd(),
      timestamp: new Date().toISOString()
    })
  }

  return c.render(
    <>
      <title>Dashboard - Runbook Admin</title>
      <header class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-4xl font-bold text-white mb-2">🔥 Runbook Admin</h1>
            <p class="text-slate-400">
              Local GUI for running and managing Runn runbooks
            </p>
            <p class="mt-4 text-sm text-slate-500">📁 {process.cwd()}</p>
          </div>
          <div class="flex space-x-3">
            <a
              href="/history"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm"
            >
              📋 History
            </a>
          </div>
        </div>
      </header>

      <main>
        <RunbookList 
          initialRunbooks={dashboardData.runbooks} 
          initialFavorites={dashboardData.favorites} 
          initialLabels={dashboardData.availableLabels}
          initialError={dashboardData.error} 
        />
      </main>
    </>
  )
})
