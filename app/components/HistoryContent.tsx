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

export async function HistoryContent() {
  console.log('📄 Loading execution history...')
  
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

  return (
    <ExecutionHistory 
      initialExecutions={historyData.executions}
      initialError={historyData.error}
    />
  )
}