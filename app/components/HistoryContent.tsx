import { ExecutionHistory } from '../islands/ExecutionHistory'
import { EnvironmentManager } from '../services/environment-manager'
import { ExecutionManager } from '../services/execution-manager'
import type { ExecutionResult } from '../types/types'

interface HistoryData {
  executions: ExecutionResult[]
  environmentVariables: Record<string, { isSecret?: boolean }>
  error: string | null
}

async function loadHistoryData(): Promise<HistoryData> {
  try {
    const executionManager = ExecutionManager.getInstance()
    const environmentManager = EnvironmentManager.getInstance()

    const [executions, envVars] = await Promise.all([
      executionManager.getAllExecutions(),
      environmentManager.getAllVariables(),
    ])

    const environmentVariables: Record<string, { isSecret?: boolean }> = {}
    envVars.forEach((v) => {
      environmentVariables[v.key] = { isSecret: v.isSecret }
    })

    return {
      executions,
      environmentVariables,
      error: null,
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error occurred'
    return {
      executions: [],
      environmentVariables: {},
      error: errorMessage,
    }
  }
}

export async function HistoryContent() {
  const historyData = await loadHistoryData()

  return (
    <ExecutionHistory
      initialExecutions={historyData.executions}
      initialEnvironmentVariables={historyData.environmentVariables}
      initialError={historyData.error}
    />
  )
}
