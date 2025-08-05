import { useState } from 'hono/jsx'
import { useConfirmDialog } from '@/components/common/ConfirmDialog'
import type { ExecutionResult } from '@/types/types'
import { Toast, useToast } from './Toast'

interface ExecutionHistoryProps {
  initialExecutions: ExecutionResult[]
  initialEnvironmentVariables: Record<string, { isSecret?: boolean }>
  initialError: string | null
}

export function ExecutionHistory({
  initialExecutions,
  initialEnvironmentVariables,
  initialError,
}: ExecutionHistoryProps) {
  const [executions, setExecutions] =
    useState<ExecutionResult[]>(initialExecutions)
  const [loading] = useState(false) // 初期データがあるのでfalse
  const [error] = useState<string | null>(initialError)
  const [environmentVariables] = useState<
    Record<string, { isSecret?: boolean }>
  >(initialEnvironmentVariables)
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog()

  const clearHistory = async () => {
    const confirmed = await showConfirm(
      'Clear Execution History',
      'Are you sure you want to clear all execution history? This action cannot be undone.',
      {
        confirmText: 'Clear All',
        cancelText: 'Cancel',
        variant: 'danger',
      },
    )

    if (!confirmed) return

    try {
      const response = await fetch('/api/executions', { method: 'DELETE' })
      const result = await response.json()

      if (result.success) {
        setExecutions([])
        showSuccess(result.message)
      } else {
        showError(`Failed to clear history: ${result.error}`)
      }
    } catch (_err) {
      showError('Failed to clear history')
    }
  }

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
        return 'text-blue-400 bg-blue-900/20'
      case 'success':
        return 'text-green-400 bg-green-900/20'
      case 'failed':
        return 'text-red-400 bg-red-900/20'
      default:
        return 'text-slate-400 bg-slate-900/20'
    }
  }

  if (loading) {
    return (
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span class="ml-3 text-slate-400">Loading execution history...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h3 class="text-red-400 font-semibold mb-2">Error Loading History</h3>
        <p class="text-red-300">{error}</p>
        <p class="text-slate-400 text-sm mt-2">
          Please refresh the page to retry.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Stats */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div class="text-slate-400 text-sm mb-1">Total Executions</div>
          <div class="text-2xl font-bold text-white">{executions.length}</div>
        </div>
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div class="text-slate-400 text-sm mb-1">Successful</div>
          <div class="text-2xl font-bold text-green-400">
            {executions.filter((e) => e.status === 'success').length}
          </div>
        </div>
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div class="text-slate-400 text-sm mb-1">Failed</div>
          <div class="text-2xl font-bold text-red-400">
            {executions.filter((e) => e.status === 'failed').length}
          </div>
        </div>
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div class="text-slate-400 text-sm mb-1">Running</div>
          <div class="text-2xl font-bold text-blue-400">
            {executions.filter((e) => e.status === 'running').length}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div class="mb-6 flex justify-end space-x-2">
        <button
          type="button"
          onClick={clearHistory}
          class="px-3 py-1 text-sm bg-red-700 hover:bg-red-600 rounded text-white"
          disabled={executions.length === 0}
        >
          🗑️ Clear History
        </button>
      </div>

      {/* Execution List */}
      {executions.length === 0 ? (
        <div class="text-center py-12">
          <div class="text-6xl mb-4">📋</div>
          <h3 class="text-xl text-slate-300 mb-2">No executions yet</h3>
          <p class="text-slate-500">
            Execute some runbooks to see the history here
          </p>
          <a
            href="/"
            class="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
          >
            Go to Runbooks
          </a>
        </div>
      ) : (
        <div class="space-y-3">
          {executions.map((execution) => (
            <a
              key={execution.id}
              href={`/history?execution=${execution.id}`}
              class="block w-full text-left bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <span
                    class={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(execution.status)}`}
                  >
                    {getStatusIcon(execution.status)}{' '}
                    {execution.status.toUpperCase()}
                  </span>
                  <div>
                    <div class="font-medium text-white">
                      {execution.runbookPath}
                    </div>
                    <div class="text-xs text-slate-400">
                      {new Date(execution.startTime).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div class="flex items-center space-x-4 text-sm">
                  <div class="text-slate-400">
                    Duration:{' '}
                    <span class="text-white">
                      {formatDuration(execution.duration)}
                    </span>
                  </div>
                  <div class="text-slate-400">
                    Exit:{' '}
                    <span
                      class={
                        execution.exitCode === 0
                          ? 'text-green-400'
                          : 'text-red-400'
                      }
                    >
                      {execution.exitCode}
                    </span>
                  </div>
                  <div class="text-slate-500 text-xs">ID: {execution.id}</div>
                </div>
              </div>

              {Object.keys(execution.variables).length > 0 &&
                (() => {
                  const envVars: Record<string, string | number | boolean> = {}
                  const runbookVars: Record<string, string | number | boolean> =
                    {}

                  Object.entries(execution.variables).forEach(
                    ([key, value]) => {
                      if (/^[A-Z][A-Z0-9_]*$/.test(key)) {
                        envVars[key] = value
                      } else {
                        runbookVars[key] = value
                      }
                    },
                  )

                  return (
                    <div class="mt-2 pt-2 border-t border-slate-700">
                      {Object.keys(envVars).length > 0 && (
                        <div class="mb-2">
                          <span class="text-xs text-slate-500 mr-2">
                            🔐 Env:
                          </span>
                          <div class="inline-flex flex-wrap gap-2">
                            {Object.entries(envVars).map(([key, value]) => (
                              <span
                                key={key}
                                class="text-xs bg-slate-700/50 border border-slate-600/50 px-2 py-1 rounded text-slate-300"
                                title="Environment Variable"
                              >
                                {key}:{' '}
                                {environmentVariables[key]?.isSecret
                                  ? '•'.repeat(String(value).length)
                                  : String(value)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {Object.keys(runbookVars).length > 0 && (
                        <div>
                          <span class="text-xs text-slate-500 mr-2">
                            📝 Vars:
                          </span>
                          <div class="inline-flex flex-wrap gap-2">
                            {Object.entries(runbookVars).map(([key, value]) => (
                              <span
                                key={key}
                                class="text-xs bg-blue-900/30 border border-blue-700/30 px-2 py-1 rounded text-blue-300"
                                title="Runbook Variable"
                              >
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
            </a>
          ))}
        </div>
      )}

      {/* Toast Notifications */}
      <Toast messages={toasts} onRemove={removeToast} />

      {/* Confirm Dialog */}
      <ConfirmDialogComponent />
    </div>
  )
}
