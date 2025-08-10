import { EnvironmentManager } from '@/services/environment-manager'
import { ExecutionManager } from '@/services/execution-manager'
import type { ExecutionResult } from '@/types/types'

interface ExecutionModalProps {
  executionId: string
  backUrl: string
}

async function getExecutionData(executionId: string) {
  try {
    const executionManager = ExecutionManager.getInstance()
    const environmentManager = EnvironmentManager.getInstance()

    // Get current execution state immediately
    const execution = executionManager.getExecution(executionId)

    if (!execution) {
      throw new Error('Execution not found')
    }

    const envVars = await environmentManager.getAllVariables()
    const environmentVariables: Record<string, { isSecret?: boolean }> = {}
    envVars.forEach((v) => {
      environmentVariables[v.key] = { isSecret: v.isSecret }
    })

    // If still running, wait for completion (max 60 seconds)
    if (execution.status === 'running') {
      let waitTime = 0
      const maxWaitTime = 60000 // 60 seconds
      const pollInterval = 100 // 100ms

      while (waitTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
        const updatedExecution = executionManager.getExecution(executionId)

        if (updatedExecution && updatedExecution.status !== 'running') {
          return {
            execution: updatedExecution,
            environmentVariables,
            error: null,
          }
        }
        waitTime += pollInterval
      }
    }

    return {
      execution,
      environmentVariables,
      error: null,
    }
  } catch (err) {
    return {
      execution: null,
      environmentVariables: {},
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    }
  }
}

function ExecutionResultContent({
  execution,
  environmentVariables,
  showSecrets = false,
}: {
  execution: ExecutionResult
  environmentVariables: Record<string, { isSecret?: boolean }>
  showSecrets?: boolean
}) {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return '🔄'
      case 'success':
        return '✅'
      case 'failed':
        return '❌'
      default:
        return '⏳'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-blue-400 bg-blue-900/20 border-blue-700/30'
      case 'success':
        return 'text-green-400 bg-green-900/20 border-green-700/30'
      case 'failed':
        return 'text-red-400 bg-red-900/20 border-red-700/30'
      default:
        return 'text-slate-400 bg-slate-900/20 border-slate-700/30'
    }
  }

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <span
            class={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(execution.status)}`}
          >
            {getStatusIcon(execution.status)} {execution.status.toUpperCase()}
          </span>
          <span class="text-slate-400 text-sm">ID: {execution.id}</span>
        </div>
        <div class="text-slate-400 text-sm">
          {execution.status === 'running' ? (
            <span class="animate-pulse">Running...</span>
          ) : (
            formatDuration(execution.duration)
          )}
        </div>
      </div>

      {/* Running indicator */}
      {execution.status === 'running' && (
        <div class="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
          <div class="flex items-center space-x-3">
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
            <div>
              <div class="text-blue-400 font-medium">
                Execution in progress...
              </div>
              <div class="text-blue-300 text-sm mt-1">
                This page will automatically update when the execution
                completes.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div class="text-slate-400 text-sm mb-1">Runbook</div>
          <div class="text-white font-mono text-sm break-all">
            {execution.runbookPath}
          </div>
        </div>
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div class="text-slate-400 text-sm mb-1">Exit Code</div>
          <div
            class={`text-lg font-bold ${execution.exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {execution.exitCode}
          </div>
        </div>
      </div>

      {/* Timing */}
      <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div class="text-slate-400 text-sm mb-2">Execution Time</div>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-slate-500">Started:</span>
            <span class="text-white ml-2">
              {new Date(execution.startTime).toLocaleString()}
            </span>
          </div>
          <div>
            <span class="text-slate-500">Ended:</span>
            <span class="text-white ml-2">
              {new Date(execution.endTime).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Variables */}
      {Object.keys(execution.variables).length > 0 && (
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div class="text-slate-400 text-sm mb-3">Variables</div>
          <div class="space-y-2">
            {Object.entries(execution.variables).map(([key, value]) => (
              <div
                key={key}
                class="flex items-center justify-between py-2 border-b border-slate-700 last:border-b-0"
              >
                <span class="text-slate-300 font-mono text-sm">{key}:</span>
                <span class="text-white font-mono text-sm">
                  {environmentVariables[key]?.isSecret && !showSecrets
                    ? '•'.repeat(String(value).length)
                    : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output */}
      {execution.output.length > 0 && (
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div class="text-slate-400 text-sm mb-3">Output</div>
          <div class="bg-black rounded p-3 max-h-64 overflow-y-auto">
            <pre class="text-green-400 text-xs font-mono whitespace-pre-wrap">
              {execution.output.join('\n')}
            </pre>
          </div>
        </div>
      )}

      {/* Error */}
      {execution.error && (
        <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div class="text-red-400 text-sm mb-2">Error</div>
          <pre class="text-red-300 text-xs font-mono whitespace-pre-wrap">
            {execution.error}
          </pre>
        </div>
      )}
    </div>
  )
}

export async function ExecutionModal({
  executionId,
  backUrl,
}: ExecutionModalProps) {
  const { execution, environmentVariables, error } =
    await getExecutionData(executionId)

  return (
    <>
      {/* Prevent body scroll */}
      <style>{`
        body {
          overflow: hidden;
          padding-right: 0px;
        }
      `}</style>

      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div class="absolute inset-0 bg-black/70" />

        {/* Modal */}
        <div class="relative bg-slate-900 border border-slate-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 class="text-xl font-bold text-white">Execution Result</h2>
            <a
              href={backUrl}
              class="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Close"
            >
              <svg
                class="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Close</title>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </a>
          </div>

          {/* Content */}
          <div class="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {error ? (
              <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
                <h3 class="text-red-400 font-semibold mb-2">
                  Error Loading Execution
                </h3>
                <p class="text-red-300">{error}</p>
              </div>
            ) : execution ? (
              <ExecutionResultContent
                execution={execution}
                environmentVariables={environmentVariables}
                showSecrets={false}
              />
            ) : (
              <div class="text-center py-12">
                <div class="text-slate-400">Loading...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
