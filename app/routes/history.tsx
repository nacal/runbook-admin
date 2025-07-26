import { createRoute } from 'honox/factory'
import { ExecutionHistory } from '../islands/ExecutionHistory'
import { ExecutionManager } from '../services/execution-manager'
import type { ExecutionResult } from '../types/types'

interface HistoryData {
  executions: ExecutionResult[]
  error: string | null
}

async function loadHistoryData(): Promise<HistoryData> {
  try {
    const manager = ExecutionManager.getInstance()
    const executions = await manager.getAllExecutions()
    
    return {
      executions,
      error: null
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    return {
      executions: [],
      error: errorMessage
    }
  }
}

export default createRoute(async (c) => {
  console.log('📄 Loading execution history...')
  
  // データ取得の実行
  const historyData = await loadHistoryData()
  
  if (historyData.error) {
    console.error('❌ History data loading failed:', {
      error: historyData.error,
      timestamp: new Date().toISOString()
    })
  } else {
    console.log(`✅ History data loaded successfully`, {
      executionsCount: historyData.executions.length,
      timestamp: new Date().toISOString()
    })
  }

  return c.render(
    <>
      <title>Execution History - Runbook Admin</title>
      <header class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-white mb-2">Execution History</h1>
            <p class="text-slate-400">View all runbook execution results</p>
          </div>
          <a 
            href="/"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
          >
            ← Back to Runbooks
          </a>
        </div>
      </header>

      <main>
        <ExecutionHistory 
          initialExecutions={historyData.executions}
          initialError={historyData.error}
        />
      </main>
    </>
  )
})